-- Public local opportunities and opt-in candidate cards, with private review.
create extension if not exists pgcrypto;

create table if not exists public.naqada_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('offer', 'seeker')),
  origin text not null default 'community' check (origin in ('community', 'external')),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'closed')),
  title text not null check (char_length(title) between 3 and 140),
  organization text check (organization is null or char_length(organization) <= 120),
  locality text not null check (char_length(locality) between 2 and 120),
  field text not null check (char_length(field) between 2 and 100),
  description text not null check (char_length(description) between 20 and 2000),
  experience text check (experience is null or char_length(experience) <= 600),
  work_type text check (work_type is null or work_type in ('full-time','part-time','temporary','flexible')),
  contact_kind text not null check (contact_kind in ('phone','whatsapp','email','link')),
  contact_value text not null check (char_length(contact_value) between 5 and 1000),
  contact_consent boolean not null default false,
  source_name text check (source_name is null or char_length(source_name) <= 120),
  source_url text unique check (source_url is null or (source_url ~ '^https://[^ ]+$' and char_length(source_url) <= 1000)),
  source_published_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seeker_consent_required check (kind <> 'seeker' or contact_consent),
  constraint external_source_required check (origin <> 'external' or (kind = 'offer' and source_url is not null)),
  constraint published_has_dates check (status <> 'published' or (published_at is not null and expires_at is not null))
);

create index if not exists naqada_jobs_public_idx on public.naqada_jobs (kind, published_at desc)
  where status = 'published';
create index if not exists naqada_jobs_pending_idx on public.naqada_jobs (created_at desc)
  where status = 'pending';

alter table public.naqada_jobs enable row level security;
revoke all on public.naqada_jobs from public, anon, authenticated;
grant select on public.naqada_jobs to anon, authenticated;
grant select, insert, update on public.naqada_jobs to service_role;

create policy naqada_jobs_public_select on public.naqada_jobs for select to anon, authenticated
  using (status = 'published' and expires_at > now());

create table if not exists public.naqada_job_feed_state (
  id integer primary key default 1 check (id = 1),
  last_attempt_at timestamptz,
  last_checked_at timestamptz,
  successful_feeds integer not null default 0,
  latest_added integer not null default 0
);
insert into public.naqada_job_feed_state (id) values (1) on conflict (id) do nothing;
alter table public.naqada_job_feed_state enable row level security;
revoke all on public.naqada_job_feed_state from public, anon, authenticated;
grant select on public.naqada_job_feed_state to anon, authenticated;
grant select, update on public.naqada_job_feed_state to service_role;
create policy naqada_job_feed_state_public on public.naqada_job_feed_state for select to anon, authenticated using (true);

create or replace function public.claim_naqada_job_refresh()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.naqada_job_feed_state
  set last_attempt_at = now()
  where id = 1 and (last_attempt_at is null or last_attempt_at < now() - interval '25 minutes');
  return found;
end;
$$;
revoke all on function public.claim_naqada_job_refresh() from public, anon, authenticated;
grant execute on function public.claim_naqada_job_refresh() to service_role;

create or replace function public.get_pending_naqada_jobs()
returns setof public.naqada_jobs language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_directory_admin(), false) then raise exception 'not_authorized'; end if;
  return query select * from public.naqada_jobs where status = 'pending' order by created_at asc limit 100;
end;
$$;
revoke all on function public.get_pending_naqada_jobs() from public, anon;
grant execute on function public.get_pending_naqada_jobs() to authenticated;

create or replace function public.moderate_naqada_job(p_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_directory_admin(), false) then raise exception 'not_authorized'; end if;
  if p_status not in ('published', 'rejected', 'closed') then raise exception 'invalid_status'; end if;
  update public.naqada_jobs
  set status = p_status,
      published_at = case when p_status = 'published' then now() else published_at end,
      expires_at = case when p_status = 'published' then now() + interval '30 days' else expires_at end,
      updated_at = now()
  where id = p_id and status in ('pending', 'published');
  return found;
end;
$$;
revoke all on function public.moderate_naqada_job(uuid, text) from public, anon;
grant execute on function public.moderate_naqada_job(uuid, text) to authenticated;
