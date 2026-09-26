-- Member-owned activities. New and edited entries wait for editorial review.
create table if not exists public.directory_owner_listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  hours text not null check (char_length(hours) between 3 and 180),
  address text not null check (char_length(address) between 5 and 240),
  description text not null check (char_length(description) between 20 and 2000),
  category text not null check (char_length(category) between 2 and 120),
  locality text not null check (char_length(locality) between 2 and 160),
  photo_paths text[] not null default '{}'::text[] check (cardinality(photo_paths) <= 5),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists directory_owner_listings_owner_idx
  on public.directory_owner_listings (owner_user_id, created_at desc);
create index if not exists directory_owner_listings_published_idx
  on public.directory_owner_listings (category, locality, created_at desc) where status = 'published';
create index if not exists directory_owner_listings_pending_idx
  on public.directory_owner_listings (created_at asc) where status = 'pending';

alter table public.directory_owner_listings enable row level security;
revoke all on public.directory_owner_listings from public, anon, authenticated;
grant select on public.directory_owner_listings to anon;
grant select, insert, update on public.directory_owner_listings to authenticated;

drop policy if exists "published activities are visible" on public.directory_owner_listings;
create policy "published activities are visible"
  on public.directory_owner_listings for select to anon, authenticated
  using (status = 'published');
drop policy if exists "members and editors read their activities" on public.directory_owner_listings;
create policy "members and editors read their activities"
  on public.directory_owner_listings for select to authenticated
  using (owner_user_id = (select auth.uid()) or (select public.is_directory_admin()));
drop policy if exists "members add activities for themselves" on public.directory_owner_listings;
create policy "members add activities for themselves"
  on public.directory_owner_listings for insert to authenticated
  with check (owner_user_id = (select auth.uid()) and status = 'pending');
drop policy if exists "members edit their activities and editors moderate" on public.directory_owner_listings;
create policy "members edit their activities and editors moderate"
  on public.directory_owner_listings for update to authenticated
  using (owner_user_id = (select auth.uid()) or (select public.is_directory_admin()))
  with check (owner_user_id = (select auth.uid()) or (select public.is_directory_admin()));

create or replace function public.guard_directory_owner_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  photo_path text;
begin
  if tg_op = 'UPDATE' then
    if old.owner_user_id is distinct from new.owner_user_id or old.id is distinct from new.id then
      raise exception 'activity owner cannot be changed';
    end if;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  new.updated_at := now();

  -- A member can never publish their own entry by talking to the Data API.
  if not coalesce(public.is_directory_admin(), false) then
    new.status := 'pending';
    new.reviewed_at := null;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.reviewed_at := now();
  end if;

  foreach photo_path in array new.photo_paths loop
    if photo_path !~ ('^' || new.owner_user_id::text || '/' || new.id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
      raise exception 'invalid activity photo path';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.guard_directory_owner_listing() from public, anon, authenticated;
drop trigger if exists directory_owner_listing_guard on public.directory_owner_listings;
create trigger directory_owner_listing_guard
before insert or update on public.directory_owner_listings
for each row execute function public.guard_directory_owner_listing();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('directory-owner-photos', 'directory-owner-photos', false, 4194304,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owners upload their activity photos" on storage.objects;
create policy "owners upload their activity photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'directory-owner-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.directory_owner_listings listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.owner_user_id = (select auth.uid())
    )
  );
drop policy if exists "published activity photos are readable" on storage.objects;
create policy "published activity photos are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'directory-owner-photos'
    and exists (
      select 1 from public.directory_owner_listings listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.status = 'published'
        and name = any(listing.photo_paths)
    )
  );
drop policy if exists "owners and editors read activity photos" on storage.objects;
create policy "owners and editors read activity photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'directory-owner-photos'
    and exists (
      select 1 from public.directory_owner_listings listing
      where listing.id::text = (storage.foldername(name))[2]
        and (listing.owner_user_id = (select auth.uid()) or (select public.is_directory_admin()))
    )
  );
drop policy if exists "owners delete their activity photos" on storage.objects;
create policy "owners delete their activity photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'directory-owner-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.directory_owner_listings listing
      where listing.id::text = (storage.foldername(name))[2]
        and listing.owner_user_id = (select auth.uid())
    )
  );
