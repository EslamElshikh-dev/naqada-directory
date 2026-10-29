-- No record payload, access token, or owner data leaves Postgres. The shared
-- bearer secret is provisioned separately in Vault and Vercel, never in Git.
create schema if not exists naqada_private;
revoke all on schema naqada_private from public, anon, authenticated;

create table if not exists naqada_private.content_revalidation (
  id boolean primary key default true check (id),
  version bigint not null default 0,
  delivered_version bigint not null default 0,
  requested_version bigint not null default 0,
  request_id bigint,
  requested_at timestamptz
);
alter table naqada_private.content_revalidation enable row level security;
revoke all on naqada_private.content_revalidation from public, anon, authenticated;
insert into naqada_private.content_revalidation(id) values (true) on conflict do nothing;

create or replace function naqada_private.dispatch_content_revalidation()
returns void language plpgsql security definer set search_path = '' as $$
declare
  state naqada_private.content_revalidation;
  bearer text;
  response_status integer;
  next_request bigint;
begin
  select * into state from naqada_private.content_revalidation where id for update;
  if state.request_id is not null then
    select status_code into response_status from net._http_response where id = state.request_id;
    if response_status = 200 then
      update naqada_private.content_revalidation set delivered_version = greatest(delivered_version, state.requested_version), request_id = null where id;
      state.delivered_version := greatest(state.delivered_version, state.requested_version);
    elsif response_status is null and state.requested_at > now() - interval '45 seconds' then
      return;
    end if;
  end if;
  if state.version <= state.delivered_version then return; end if;
  select decrypted_secret into bearer from vault.decrypted_secrets where name = 'naqada_content_revalidation_secret';
  if bearer is null or length(bearer) < 32 then return; end if;
  select net.http_post(
    url := 'https://naqada-directory.vercel.app/api/revalidate/',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || bearer),
    body := jsonb_build_object('source', 'supabase', 'version', state.version),
    timeout_milliseconds := 10000
  ) into next_request;
  update naqada_private.content_revalidation set request_id = next_request, requested_version = state.version, requested_at = now() where id;
end;
$$;
revoke all on function naqada_private.dispatch_content_revalidation() from public, anon, authenticated;

create or replace function naqada_private.content_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update naqada_private.content_revalidation set version = version + 1 where id;
  perform naqada_private.dispatch_content_revalidation();
  return null;
end;
$$;
revoke all on function naqada_private.content_changed() from public, anon, authenticated;

do $$
declare target text;
begin
  foreach target in array array['directory_curated_content', 'directory_owner_listings', 'naqada_jobs', 'naqada_job_feed_state', 'naqada_news_archive'] loop
    execute format('create trigger naqada_content_revalidation after insert or update or delete on public.%I for each statement execute function naqada_private.content_changed()', target);
  end loop;
end;
$$;

-- Retry network failures and acknowledge successful asynchronous pg_net replies.
select cron.schedule('naqada-content-revalidation', '* * * * *', 'select naqada_private.dispatch_content_revalidation()');

