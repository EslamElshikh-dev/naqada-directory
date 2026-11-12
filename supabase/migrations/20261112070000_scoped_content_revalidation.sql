-- Deploy the scoped /api/revalidate handler before this migration. Only scope
-- names and a monotonic version leave Postgres; never record IDs or payloads.
create table if not exists naqada_private.content_revalidation_scopes (
  scope text primary key check (scope in ('business','owner-listings','jobs','news','news-archive','article','role_model')),
  version bigint not null
);
alter table naqada_private.content_revalidation_scopes enable row level security;
revoke all on naqada_private.content_revalidation_scopes from public, anon, authenticated;

-- Preserve unacknowledged work from the old, unscoped dispatcher. Its in-flight
-- request invalidates every scope, so acknowledging that snapshot remains safe.
insert into naqada_private.content_revalidation_scopes(scope,version)
select scope,state.version from naqada_private.content_revalidation state
cross join unnest(array['business','owner-listings','jobs','news','news-archive','article','role_model']) scope
where state.version > state.delivered_version
on conflict (scope) do update set version=greatest(content_revalidation_scopes.version,excluded.version);

create or replace function naqada_private.dispatch_content_revalidation()
returns void language plpgsql security definer set search_path = '' as $$
declare
  state naqada_private.content_revalidation;
  bearer text;
  response_status integer;
  next_request bigint;
  pending_scopes jsonb;
begin
  -- All producers take this same lock before changing the version and scopes.
  select * into state from naqada_private.content_revalidation where id for update;
  if state.request_id is not null then
    select status_code into response_status from net._http_response where id = state.request_id;
    if response_status = 200 then
      update naqada_private.content_revalidation set delivered_version = greatest(delivered_version,state.requested_version), request_id = null where id;
      state.delivered_version := greatest(state.delivered_version,state.requested_version);
    elsif response_status is null and state.requested_at > now() - interval '45 seconds' then
      return;
    end if;
  end if;
  if state.version <= state.delivered_version then return; end if;
  select jsonb_agg(scope order by scope) into pending_scopes
    from naqada_private.content_revalidation_scopes where version > state.delivered_version;
  if pending_scopes is null then return; end if;
  select decrypted_secret into bearer from vault.decrypted_secrets where name = 'naqada_content_revalidation_secret';
  if bearer is null or length(bearer) < 32 then return; end if;
  select net.http_post(
    url := 'https://naqada-directory.vercel.app/api/revalidate/',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || bearer),
    body := jsonb_build_object('source','supabase','version',state.version,'scopes',pending_scopes),
    timeout_milliseconds := 10000
  ) into next_request;
  update naqada_private.content_revalidation set request_id=next_request, requested_version=state.version, requested_at=now() where id;
end;
$$;
revoke all on function naqada_private.dispatch_content_revalidation() from public, anon, authenticated;

-- Compare the public representation, not private review/draft/bookkeeping data.
-- A hidden curated row is public too: it suppresses a static/original fallback.
create or replace function naqada_private.public_content_projection(target text, row_data jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare keys text[];
begin
  if row_data is null then return null; end if;
  if target='directory_curated_content' then
    if row_data->>'status' not in ('published','hidden') then return null; end if;
    keys := array['kind','slug','origin','status','updated_at'];
    if row_data->>'status'='published' then keys := keys || 'payload'::text; end if;
  elsif target='directory_owner_listings' then
    if row_data->>'status' <> 'published' then return null; end if;
    keys := array['id','owner_user_id','name','phone','hours','address','description','category','locality','photo_paths','cover_path','maps_url','status','created_at','updated_at','reviewed_at'];
  elsif target='naqada_jobs' then
    if row_data->>'status' <> 'published' then return null; end if;
    keys := array['id','kind','origin','title','organization','locality','governorate','field','description','experience','work_type','contact_kind','contact_value','source_name','source_url','published_at','expires_at'];
  elsif target='directory_business_locations' then
    keys := array['place_id','latitude','longitude'];
  elsif target='naqada_news_archive' then
    keys := array['id','url','payload','published_at'];
  else return null;
  end if;
  return (select jsonb_object_agg(key,value) from jsonb_each(row_data) where key=any(keys));
end;
$$;
revoke all on function naqada_private.public_content_projection(text,jsonb) from public, anon, authenticated;

create or replace function naqada_private.content_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_data jsonb;
  after_data jsonb;
  changed_scopes text[];
  next_version bigint;
begin
  if TG_OP <> 'INSERT' then before_data := naqada_private.public_content_projection(TG_TABLE_NAME,to_jsonb(OLD)); end if;
  if TG_OP <> 'DELETE' then after_data := naqada_private.public_content_projection(TG_TABLE_NAME,to_jsonb(NEW)); end if;
  if before_data is not distinct from after_data then return null; end if;
  if TG_TABLE_NAME='directory_curated_content' then
    -- Include both kinds on a move, including removal of the old visible row.
    changed_scopes := array[before_data->>'kind',after_data->>'kind'];
  else
    changed_scopes := array[case TG_TABLE_NAME when 'directory_owner_listings' then 'owner-listings'
      when 'naqada_jobs' then 'jobs' when 'naqada_news_archive' then 'news-archive'
      when 'directory_business_locations' then 'business' end];
  end if;
  update naqada_private.content_revalidation set version=version+1 where id returning version into next_version;
  insert into naqada_private.content_revalidation_scopes(scope,version)
    select distinct scope,next_version from unnest(changed_scopes) scope where scope is not null
    on conflict (scope) do update set version=excluded.version;
  perform naqada_private.dispatch_content_revalidation();
  return null;
end;
$$;
revoke all on function naqada_private.content_changed() from public, anon, authenticated;

do $$
declare target text;
begin
  foreach target in array array['directory_curated_content','directory_owner_listings','naqada_jobs','naqada_job_feed_state','naqada_news_archive','directory_business_locations'] loop
    execute format('drop trigger if exists naqada_content_revalidation on public.%I',target);
    if target <> 'naqada_job_feed_state' then
      -- Row triggers do not fire on zero-row writes or ignored duplicates.
      execute format('create trigger naqada_content_revalidation after insert or update or delete on public.%I for each row execute function naqada_private.content_changed()',target);
    end if;
  end loop;
end;
$$;
