-- Isolated fresh-schema acceptance only; never run fixtures against production.
-- This transaction rolls back the probe table and its identity sequence.
begin;

do $$
declare
  entry record;
  api_role text;
  privilege text;
  expected text;
  table_count integer := 0;
begin
  if exists (
    select 1 from pg_tables where schemaname = 'public' and not rowsecurity
  ) then raise exception 'Every public application table must keep RLS enabled'; end if;

  -- Table-level grants only. Authenticated contributions deliberately use a
  -- restricted column projection, exercised by the SQL and HTTP workflow tests.
  for entry in select * from (values
    ('analytics_pageviews', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('analytics_visitors', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_admins', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_business_locations', 'SELECT', 'SELECT', ''),
    ('directory_contributions', '', '', 'SELECT,INSERT'),
    ('directory_contributor_accounts', '', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_contributor_permissions', '', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_contributors', 'SELECT', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_curated_content', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_events', '', '', 'INSERT'),
    ('directory_member_roles', '', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_member_state', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_moderator_audit', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_owner_listings', 'SELECT', 'SELECT,INSERT,UPDATE', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_ratings', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('directory_request_notifications', '', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('member_profiles', '', 'SELECT,INSERT,UPDATE', 'SELECT,INSERT,UPDATE,DELETE'),
    ('naqada_job_feed_state', 'SELECT', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('naqada_jobs', 'SELECT', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('naqada_news_archive', 'SELECT', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('naqada_news_refresh_lock', '', '', 'SELECT,INSERT,UPDATE,DELETE'),
    ('naqada_sanad_interactions', '', 'SELECT', 'SELECT,INSERT,UPDATE,DELETE'),
    ('public_request_limits', '', '', ''),
    ('site_reviews', '', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT,INSERT,UPDATE,DELETE')
  ) as matrix(table_name, anon_grants, authenticated_grants, service_grants)
  loop
    table_count := table_count + 1;
    foreach api_role in array array['anon', 'authenticated', 'service_role'] loop
      if not has_schema_privilege(api_role, 'public', 'USAGE') then
        raise exception '% cannot reach the public schema', api_role;
      end if;
      expected := case api_role
        when 'anon' then entry.anon_grants
        when 'authenticated' then entry.authenticated_grants
        else entry.service_grants end;
      foreach privilege in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
        if has_table_privilege(api_role, 'public.' || entry.table_name, privilege)
           is distinct from (privilege = any(string_to_array(expected, ','))) then
          raise exception 'Unexpected privilege: role %, table %, operation %, expected grants [%]',
            api_role, entry.table_name, privilege, expected;
        end if;
      end loop;
    end loop;
  end loop;
  if table_count <> (select count(*) from pg_tables where schemaname = 'public') then
    raise exception 'A new public table needs a reviewed role/operation contract';
  end if;

  -- The private webhook state is used by its owner through a trigger, not by
  -- Data API clients. BYPASSRLS does not replace schema or table privileges.
  foreach api_role in array array['anon', 'authenticated', 'service_role'] loop
    if has_schema_privilege(api_role, 'naqada_private', 'USAGE')
       or has_table_privilege(api_role, 'naqada_private.content_revalidation', 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'Private webhook state exposed to %', api_role;
    end if;
  end loop;
end $$;

-- Prove defaults stay closed for a table created AFTER the full replay, too.
create table public.data_api_default_probe (id bigint generated always as identity);
alter table public.data_api_default_probe enable row level security;
do $$
declare api_role text;
begin
  foreach api_role in array array['anon', 'authenticated', 'service_role'] loop
    if has_table_privilege(api_role, 'public.data_api_default_probe', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       or has_sequence_privilege(api_role, 'public.data_api_default_probe_id_seq', 'USAGE,SELECT,UPDATE') then
      raise exception 'Implicit table or sequence grants returned for %', api_role;
    end if;
  end loop;
end $$;

rollback;
