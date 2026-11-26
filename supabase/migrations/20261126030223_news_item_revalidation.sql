-- Deploy the compatible application first. This private outbox stores public
-- news route IDs only: no payloads, editor IDs, credentials or owner records.
create table if not exists naqada_private.content_revalidation_news_items (
  id text primary key check (id='*' or id ~ '^[a-zA-Z0-9-]{3,90}$'),
  version bigint not null
);
alter table naqada_private.content_revalidation_news_items enable row level security;
revoke all on naqada_private.content_revalidation_news_items from public, anon, authenticated;

-- Pending messages from the older dispatcher have no item coverage. Keep an
-- explicit broad marker until that version is acknowledged. Replaying this
-- migration must not broaden already recorded targeted work.
insert into naqada_private.content_revalidation_news_items(id,version)
select '*',max(s.version) from naqada_private.content_revalidation_scopes s
cross join naqada_private.content_revalidation r
where s.scope in ('news','news-archive') and s.version > r.delivered_version
and not exists (select 1 from naqada_private.content_revalidation_news_items i where i.version > r.delivered_version)
having max(s.version) is not null
on conflict (id) do update set version=greatest(content_revalidation_news_items.version,excluded.version);

create or replace function naqada_private.dispatch_content_revalidation()
returns void language plpgsql security definer set search_path = '' as $$
declare
  state naqada_private.content_revalidation;
  bearer text;
  response_status integer;
  next_request bigint;
  pending_scopes jsonb;
  pending_items jsonb;
  request_body jsonb;
begin
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
  -- Producers use the same serialized row lock. A newer update of the same ID
  -- has a newer version and cannot be deleted by an older acknowledgement.
  delete from naqada_private.content_revalidation_news_items where version <= state.delivered_version;
  if state.version <= state.delivered_version then return; end if;
  select jsonb_agg(scope order by scope) into pending_scopes
    from naqada_private.content_revalidation_scopes where version > state.delivered_version;
  if pending_scopes is null then return; end if;
  request_body := jsonb_build_object('source','supabase','version',state.version,'scopes',pending_scopes);
  if pending_scopes ? 'news' or pending_scopes ? 'news-archive' then
    select jsonb_agg(id order by id) into pending_items
      from naqada_private.content_revalidation_news_items where version > state.delivered_version;
    -- Missing coverage, an invalid/legacy ID or a batch over the API bound
    -- retains full news invalidation; it must never be truncated then acked.
    if pending_items is not null and jsonb_array_length(pending_items) between 1 and 100 and not (pending_items ? '*') then
      request_body := request_body || jsonb_build_object('newsItems',pending_items);
    end if;
  end if;
  select decrypted_secret into bearer from vault.decrypted_secrets where name = 'naqada_content_revalidation_secret';
  if bearer is null or length(bearer) < 32 then return; end if;
  select net.http_post(
    url := 'https://naqada-directory.vercel.app/api/revalidate/',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || bearer),
    body := request_body, timeout_milliseconds := 10000
  ) into next_request;
  update naqada_private.content_revalidation set request_id=next_request, requested_version=state.version, requested_at=now() where id;
end;
$$;
revoke all on function naqada_private.dispatch_content_revalidation() from public, anon, authenticated;

create or replace function naqada_private.content_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_data jsonb;
  after_data jsonb;
  changed_scopes text[];
  changed_items text[] := array[]::text[];
  next_version bigint;
begin
  if TG_OP <> 'INSERT' then before_data := naqada_private.public_content_projection(TG_TABLE_NAME,to_jsonb(OLD)); end if;
  if TG_OP <> 'DELETE' then after_data := naqada_private.public_content_projection(TG_TABLE_NAME,to_jsonb(NEW)); end if;
  if before_data is not distinct from after_data then return null; end if;
  if TG_TABLE_NAME='directory_curated_content' then
    changed_scopes := array[before_data->>'kind',after_data->>'kind'];
    if before_data->>'kind'='news' then changed_items := array_append(changed_items,before_data->>'slug'); end if;
    if after_data->>'kind'='news' then changed_items := array_append(changed_items,after_data->>'slug'); end if;
  else
    changed_scopes := array[case TG_TABLE_NAME when 'directory_owner_listings' then 'owner-listings'
      when 'naqada_jobs' then 'jobs' when 'naqada_news_archive' then 'news-archive'
      when 'directory_business_locations' then 'business' end];
    if TG_TABLE_NAME='naqada_news_archive' then
      changed_items := array[before_data->>'id',after_data->>'id'];
    end if;
  end if;
  update naqada_private.content_revalidation set version=version+1 where id returning version into next_version;
  insert into naqada_private.content_revalidation_scopes(scope,version)
    select distinct scope,next_version from unnest(changed_scopes) scope where scope is not null
    on conflict (scope) do update set version=excluded.version;
  insert into naqada_private.content_revalidation_news_items(id,version)
    select distinct case when item ~ '^[a-zA-Z0-9-]{3,90}$' then item else '*' end,next_version
    from unnest(changed_items) item where item is not null
    on conflict (id) do update set version=excluded.version;
  perform naqada_private.dispatch_content_revalidation();
  return null;
end;
$$;
revoke all on function naqada_private.content_changed() from public, anon, authenticated;
