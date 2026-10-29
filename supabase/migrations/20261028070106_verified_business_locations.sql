create table public.directory_business_locations (
  place_id text primary key,
  latitude numeric(10,7) not null check (latitude between -90 and 90),
  longitude numeric(11,7) not null check (longitude between -180 and 180),
  source_url text not null check (source_url like 'https://www.google.com/maps/%'),
  source_name text not null,
  checked_at timestamptz not null
);
alter table public.directory_business_locations enable row level security;
revoke all on public.directory_business_locations from public, anon, authenticated;
grant select on public.directory_business_locations to anon, authenticated;
create policy "Public verified place coordinates" on public.directory_business_locations for select to anon, authenticated using (true);
create trigger naqada_content_revalidation after insert or update or delete on public.directory_business_locations
  for each statement execute function naqada_private.content_changed();

