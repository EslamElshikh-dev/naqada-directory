-- Restored from Supabase schema history: 20260906091221 / add_gold_contributor_roles.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

create table if not exists public.directory_contributors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  honorific text,
  role_code text not null default 'contributor',
  role_label text not null default 'مساهم',
  badges text[] not null default '{}',
  primary_work text,
  is_author boolean not null default false,
  bio text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.directory_contributor_accounts (
  contributor_id uuid not null references public.directory_contributors(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (contributor_id, user_id)
);

create table if not exists public.directory_contributor_permissions (
  contributor_id uuid not null references public.directory_contributors(id) on delete cascade,
  permission text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (contributor_id, permission)
);

alter table public.directory_contributors enable row level security;

alter table public.directory_contributor_accounts enable row level security;

alter table public.directory_contributor_permissions enable row level security;

revoke all on public.directory_contributors from anon, authenticated;

revoke all on public.directory_contributor_accounts from anon, authenticated;

revoke all on public.directory_contributor_permissions from anon, authenticated;

grant select on public.directory_contributors to anon, authenticated;

grant select on public.directory_contributor_accounts to authenticated;

grant select on public.directory_contributor_permissions to authenticated;

grant select, insert, update, delete on public.directory_contributors to service_role;

grant select, insert, update, delete on public.directory_contributor_accounts to service_role;

grant select, insert, update, delete on public.directory_contributor_permissions to service_role;

create policy "public can read active contributor profiles"
on public.directory_contributors for select
to anon, authenticated
using (status = 'active');

create policy "contributors can read their own account mapping"
on public.directory_contributor_accounts for select
to authenticated
using ((select auth.uid()) = user_id and active = true);

create policy "contributors can read their own permissions"
on public.directory_contributor_permissions for select
to authenticated
using (
  exists (
    select 1
    from public.directory_contributor_accounts a
    where a.contributor_id = directory_contributor_permissions.contributor_id
      and a.user_id = (select auth.uid())
      and a.active = true
  )
);

create or replace function public.touch_directory_contributor_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.touch_directory_contributor_updated_at() from public, anon, authenticated;

grant execute on function public.touch_directory_contributor_updated_at() to service_role;

drop trigger if exists directory_contributors_touch_updated_at on public.directory_contributors;

create trigger directory_contributors_touch_updated_at
before update on public.directory_contributors
for each row execute function public.touch_directory_contributor_updated_at();
