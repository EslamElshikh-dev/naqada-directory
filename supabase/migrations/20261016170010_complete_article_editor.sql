-- Full article documents use the existing editorial role, with isolated drafts.
alter table public.directory_curated_content drop constraint directory_curated_content_kind_check;
alter table public.directory_curated_content add constraint directory_curated_content_kind_check check (kind in ('business','news','article','role_model'));
alter table public.directory_curated_content add column draft_payload jsonb;
alter table public.directory_curated_content add column draft_updated_at timestamptz;
alter table public.directory_curated_content add constraint curated_draft_object check (draft_payload is null or jsonb_typeof(draft_payload)='object');

create or replace function public.save_naqada_article_document(
  p_kind text, p_slug text, p_origin text, p_status text, p_payload jsonb,
  p_expected_version timestamptz default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.directory_curated_content%rowtype; v_version timestamptz; v_now timestamptz := clock_timestamp(); v_doc jsonb;
begin
  if (select auth.uid()) is null or not public.can_moderate_naqada() then raise exception 'not authorized' using errcode='42501'; end if;
  if p_kind not in ('article','role_model') or p_origin not in ('static','original') or p_status not in ('draft','published','hidden')
    or char_length(p_slug) not between 3 and 170 or p_slug ~ '[/#?[:space:]]'
    or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>340000 then raise exception 'invalid document'; end if;
  v_doc := (p_payload->>'document')::jsonb;
  if jsonb_typeof(v_doc) is distinct from 'object' or jsonb_typeof(v_doc->'content') is distinct from 'object'
    or v_doc->'content'->>'slug' is distinct from p_slug
    or v_doc->>'format' is distinct from (case when p_kind='article' then 'editorial' else 'role_model' end)
    then raise exception 'invalid document'; end if;
  if p_status='published' and (char_length(trim(coalesce(p_payload->>'title','')))<3 or char_length(trim(coalesce(p_payload->>'summary','')))<15) then raise exception 'incomplete document'; end if;
  -- Serialize first creation as well as updates of the same article.
  perform pg_advisory_xact_lock(hashtextextended(p_kind || '/' || p_slug,0));
  select * into v_row from public.directory_curated_content where kind=p_kind and slug=p_slug for update;
  if found then
    if v_row.origin <> p_origin then raise exception 'origin mismatch'; end if;
    v_version := coalesce(v_row.draft_updated_at,v_row.updated_at);
    if p_expected_version is null or p_expected_version <> v_version then raise exception 'article changed' using errcode='40001'; end if;
  else
    if p_expected_version is not null then raise exception 'article changed' using errcode='40001'; end if;
    insert into public.directory_curated_content(kind,slug,origin,status,payload,created_by,updated_by)
      values(p_kind,p_slug,p_origin,'draft','{}'::jsonb,(select auth.uid()),(select auth.uid())) returning * into v_row;
  end if;
  if p_status='draft' then
    update public.directory_curated_content set draft_payload=p_payload,draft_updated_at=v_now,updated_by=(select auth.uid()) where id=v_row.id;
  else
    update public.directory_curated_content set status=p_status,payload=p_payload,updated_at=v_now,
      draft_payload=null,draft_updated_at=null,updated_by=(select auth.uid()) where id=v_row.id;
  end if;
  insert into public.directory_moderator_audit(actor_id,action,target_kind,target_id,detail)
    values((select auth.uid()),'content_' || p_status,p_kind,p_slug,jsonb_build_object('origin',p_origin,'editor','complete_article'));
  return jsonb_build_object('id',v_row.id,'version',v_now,'status',p_status);
end;
$$;
revoke all on function public.save_naqada_article_document(text,text,text,text,jsonb,timestamptz) from public, anon;
grant execute on function public.save_naqada_article_document(text,text,text,text,jsonb,timestamptz) to authenticated;

create or replace function public.get_naqada_editor_content(p_kind text default null)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null or not public.can_moderate_naqada() then raise exception 'not authorized'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'kind',kind,'slug',slug,'origin',origin,
    'status',case when draft_payload is not null then 'draft' else status end,'publishedStatus',status,
    'payload',coalesce(draft_payload,payload),'updatedAt',updated_at,'version',coalesce(draft_updated_at,updated_at)
  ) order by coalesce(draft_updated_at,updated_at) desc),'[]'::jsonb)
    from (select * from public.directory_curated_content where p_kind is null or kind=p_kind
      order by coalesce(draft_updated_at,updated_at) desc limit 150) records);
end;
$$;
revoke all on function public.get_naqada_editor_content(text) from public, anon;
grant execute on function public.get_naqada_editor_content(text) to authenticated;

create or replace function public.get_public_naqada_content(p_kind text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if p_kind not in ('business','news','article','role_model') then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'slug',slug,'origin',origin,'status',status,
    'payload',case when status='published' then payload else '{}'::jsonb end,'updatedAt',updated_at
  ) order by updated_at desc),'[]'::jsonb) from public.directory_curated_content where kind=p_kind and status in ('published','hidden'));
end;
$$;
revoke all on function public.get_public_naqada_content(text) from public;
grant execute on function public.get_public_naqada_content(text) to anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('directory-article-media','directory-article-media',false,6000000,array['image/webp'])
  on conflict(id) do nothing;
create or replace function public.is_published_naqada_article_media(p_path text)
returns boolean language sql stable security definer set search_path=''
as $$
  select p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' and exists (
    select 1 from public.directory_curated_content where kind in ('article','role_model') and status='published'
    and position(('"/api/article-media/' || p_path || '"') in coalesce(payload->>'document',''))>0
  );
$$;
revoke all on function public.is_published_naqada_article_media(text) from public;
grant execute on function public.is_published_naqada_article_media(text) to anon, authenticated;
create policy "editors insert article media" on storage.objects for insert to authenticated
  with check(bucket_id='directory-article-media' and public.can_moderate_naqada()
    and (storage.foldername(name))[1]=(select auth.uid())::text and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
create policy "editors read draft article media" on storage.objects for select to authenticated
  using(bucket_id='directory-article-media' and public.can_moderate_naqada());
create policy "read published article media" on storage.objects for select to anon, authenticated
  using(bucket_id='directory-article-media' and public.is_published_naqada_article_media(name));
