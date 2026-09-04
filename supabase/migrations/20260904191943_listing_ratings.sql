-- Public listing ratings are written through the server-side Edge Function.
-- Browser roles have no direct table access; RLS remains enabled as defense in depth.

create table if not exists public.directory_ratings (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null check (char_length(listing_slug) between 2 and 220),
  score smallint not null check (score between 1 and 5),
  rater_hash text not null check (char_length(rater_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_slug, rater_hash)
);

create index if not exists directory_ratings_listing_created_idx
  on public.directory_ratings (listing_slug, created_at desc);

alter table public.directory_ratings enable row level security;

revoke all on table public.directory_ratings from public, anon, authenticated;
grant select, insert, update on table public.directory_ratings to service_role;

create or replace function public.touch_directory_rating_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_directory_rating_updated_at() from public, anon, authenticated;

drop trigger if exists directory_ratings_touch_updated_at on public.directory_ratings;
create trigger directory_ratings_touch_updated_at
before update on public.directory_ratings
for each row execute function public.touch_directory_rating_updated_at();
