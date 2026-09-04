-- Reproducible baseline for the private Naqada Directory intake/analytics backend.
-- Safe to apply to an existing project: objects are created idempotently and
-- public browser roles remain unable to read or write the private tables.

create extension if not exists pgcrypto;

create table if not exists public.directory_contributions (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('add','correction','missing')),
  name text not null check (char_length(name) between 2 and 160),
  category text check (category is null or char_length(category) <= 120),
  locality text check (locality is null or char_length(locality) <= 160),
  details text check (details is null or char_length(details) <= 2000),
  source_url text check (source_url is null or char_length(source_url) <= 1000),
  contact text check (contact is null or char_length(contact) <= 320),
  listing_slug text check (listing_slug is null or char_length(listing_slug) <= 220),
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected','published')),
  submitted_via text not null default 'web' check (submitted_via in ('web','admin','import')),
  review_notes text check (review_notes is null or char_length(review_notes) <= 2000),
  reviewer text check (reviewer is null or char_length(reviewer) <= 160),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists directory_contributions_status_created_idx
  on public.directory_contributions (status, created_at desc);
create index if not exists directory_contributions_type_created_idx
  on public.directory_contributions (request_type, created_at desc);

create table if not exists public.directory_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('search','zero_results','listing_call','listing_whatsapp','listing_map','contribution_submitted','listing_share')),
  query_text text check (query_text is null or char_length(query_text) <= 160),
  result_count integer check (result_count is null or result_count between 0 and 10000),
  category text check (category is null or char_length(category) <= 120),
  locality text check (locality is null or char_length(locality) <= 160),
  listing_slug text check (listing_slug is null or char_length(listing_slug) <= 220),
  session_hint text check (session_hint is null or char_length(session_hint) <= 80),
  created_at timestamptz not null default now()
);

create index if not exists directory_events_type_created_idx
  on public.directory_events (event_type, created_at desc);
create index if not exists directory_events_zero_query_idx
  on public.directory_events (query_text, created_at desc)
  where event_type = 'zero_results' and query_text is not null;

create table if not exists public.public_request_limits (
  endpoint text not null check (char_length(endpoint) <= 80),
  ip_hash text not null check (char_length(ip_hash) = 64),
  bucket_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (endpoint, ip_hash, bucket_start)
);

alter table public.directory_contributions enable row level security;
alter table public.directory_events enable row level security;
alter table public.public_request_limits enable row level security;

revoke all on table public.directory_contributions from public, anon, authenticated;
revoke all on table public.directory_events from public, anon, authenticated;
revoke all on table public.public_request_limits from public, anon, authenticated;

-- New Supabase projects no longer have to auto-expose tables to API roles.
-- Grant only what the server-side Edge Function needs instead of relying on defaults.
grant select, insert on table public.directory_contributions to service_role;
grant insert on table public.directory_events to service_role;

create or replace function public.consume_public_rate_limit(
  p_endpoint text,
  p_ip_hash text,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if p_limit < 1 or char_length(p_endpoint) > 80 or char_length(p_ip_hash) <> 64 then
    return false;
  end if;

  insert into public.public_request_limits(endpoint, ip_hash, bucket_start, request_count)
  values (p_endpoint, p_ip_hash, v_bucket, 1)
  on conflict (endpoint, ip_hash, bucket_start)
  do update set request_count = public.public_request_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_public_rate_limit(text,text,integer) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text,text,integer) to service_role;

create or replace function public.touch_directory_contribution_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_directory_contribution_updated_at() from public, anon, authenticated;

drop trigger if exists directory_contributions_touch_updated_at on public.directory_contributions;
create trigger directory_contributions_touch_updated_at
before update on public.directory_contributions
for each row execute function public.touch_directory_contribution_updated_at();
