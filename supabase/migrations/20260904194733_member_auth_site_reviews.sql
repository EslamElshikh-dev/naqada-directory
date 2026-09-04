-- Member accounts, profiles, site reviews, and protected dashboard access.

create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text check (phone is null or phone ~ '^\+?[0-9]{7,15}$'),
  locality text check (locality is null or char_length(locality) <= 100),
  bio text check (bio is null or char_length(bio) <= 280),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 20 and 800),
  author_name text not null check (char_length(author_name) between 2 and 80),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.directory_admins (
  email text primary key check (email = lower(email) and char_length(email) <= 320),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.directory_admins (email, active)
values ('moqawel1215@gmail.com', true)
on conflict (email) do update set active = excluded.active;

create index if not exists site_reviews_status_created_idx
  on public.site_reviews (status, created_at desc);

alter table public.member_profiles enable row level security;
alter table public.site_reviews enable row level security;
alter table public.directory_admins enable row level security;

revoke all on table public.member_profiles from public, anon;
revoke all on table public.site_reviews from public, anon;
revoke all on table public.directory_admins from public, anon, authenticated;

grant select, insert, update on table public.member_profiles to authenticated;
grant select, insert, update, delete on table public.site_reviews to authenticated;

drop policy if exists "members read own profile" on public.member_profiles;
create policy "members read own profile"
on public.member_profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "members insert own profile" on public.member_profiles;
create policy "members insert own profile"
on public.member_profiles for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "members update own profile" on public.member_profiles;
create policy "members update own profile"
on public.member_profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "members read own site review" on public.site_reviews;
create policy "members read own site review"
on public.site_reviews for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "members publish own site review" on public.site_reviews;
create policy "members publish own site review"
on public.site_reviews for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'published');

drop policy if exists "members update own site review" on public.site_reviews;
create policy "members update own site review"
on public.site_reviews for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and status = 'published');

drop policy if exists "members delete own site review" on public.site_reviews;
create policy "members delete own site review"
on public.site_reviews for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_naqada_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.member_profiles (id, full_name, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'عضو دليل نقادة'), 80),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'avatar_url', ''), 500), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_naqada_member() from public, anon, authenticated;

drop trigger if exists on_naqada_auth_user_created on auth.users;
create trigger on_naqada_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_naqada_member();

create or replace function public.touch_naqada_member_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_naqada_member_rows() from public, anon, authenticated;

drop trigger if exists member_profiles_touch_updated_at on public.member_profiles;
create trigger member_profiles_touch_updated_at
before update on public.member_profiles
for each row execute function public.touch_naqada_member_rows();

drop trigger if exists site_reviews_touch_updated_at on public.site_reviews;
create trigger site_reviews_touch_updated_at
before update on public.site_reviews
for each row execute function public.touch_naqada_member_rows();

create or replace function public.get_public_site_reviews()
returns table (
  id uuid,
  rating smallint,
  body text,
  author_name text,
  created_at timestamptz,
  updated_at timestamptz,
  is_own boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    review.id,
    review.rating,
    review.body,
    review.author_name,
    review.created_at,
    review.updated_at,
    coalesce((select auth.uid()) = review.user_id, false) as is_own
  from public.site_reviews review
  where review.status = 'published'
  order by review.created_at desc
  limit 100;
$$;

revoke all on function public.get_public_site_reviews() from public;
grant execute on function public.get_public_site_reviews() to anon, authenticated;

create or replace function public.get_public_site_review_summary()
returns table (review_count bigint, average_rating numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint, coalesce(round(avg(rating)::numeric, 1), 0)
  from public.site_reviews
  where status = 'published';
$$;

revoke all on function public.get_public_site_review_summary() from public;
grant execute on function public.get_public_site_review_summary() to anon, authenticated;

create or replace function public.is_directory_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.directory_admins admin
      where admin.active
        and admin.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    );
$$;

revoke all on function public.is_directory_admin() from public, anon;
grant execute on function public.is_directory_admin() to authenticated;

create or replace function public.get_naqada_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_directory_admin() then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'members', (select count(*) from public.member_profiles),
    'siteReviews', (select count(*) from public.site_reviews where status = 'published'),
    'siteRating', (select coalesce(round(avg(rating)::numeric, 1), 0) from public.site_reviews where status = 'published'),
    'listingRatings', (select count(*) from public.directory_ratings),
    'pendingContributions', (select count(*) from public.directory_contributions where status in ('pending', 'reviewing')),
    'events30d', (select count(*) from public.directory_events where created_at >= now() - interval '30 days')
  );
end;
$$;

revoke all on function public.get_naqada_admin_stats() from public, anon;
grant execute on function public.get_naqada_admin_stats() to authenticated;
