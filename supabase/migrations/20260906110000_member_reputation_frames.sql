alter table public.directory_contributions
  add column if not exists submitted_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists directory_contributions_submitted_by_user_id_idx
  on public.directory_contributions(submitted_by_user_id, created_at desc);

drop policy if exists "members can read own contributions" on public.directory_contributions;
create policy "members can read own contributions"
  on public.directory_contributions
  for select
  to authenticated
  using ((select auth.uid()) = submitted_by_user_id);

create table if not exists public.directory_member_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role_code text not null,
  role_label text not null,
  frame_code text not null default 'gray' check (frame_code in ('gray','bronze','silver','gold','diamond')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.directory_member_roles enable row level security;

drop policy if exists "members can read own directory role" on public.directory_member_roles;
create policy "members can read own directory role"
  on public.directory_member_roles
  for select
  to authenticated
  using ((select auth.uid()) = user_id and active = true);

grant select on public.directory_member_roles to authenticated;
grant select on public.directory_contributions to authenticated;

drop function if exists public.get_public_site_reviews();
create function public.get_public_site_reviews()
returns table(
  id uuid,
  rating smallint,
  body text,
  author_name text,
  author_bio text,
  created_at timestamptz,
  updated_at timestamptz,
  is_own boolean,
  frame_code text,
  role_label text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    review.id,
    review.rating,
    review.body,
    coalesce(profile.full_name, review.author_name) as author_name,
    profile.bio as author_bio,
    review.created_at,
    review.updated_at,
    coalesce((select auth.uid()) = review.user_id, false) as is_own,
    coalesce(
      member_role.frame_code,
      case
        when coalesce(contrib.contribution_count, 0) > 100 or coalesce(profile.created_at, review.created_at) <= now() - interval '1 year' then 'gold'
        when coalesce(contrib.contribution_count, 0) > 50 then 'silver'
        when coalesce(contrib.contribution_count, 0) > 10 then 'bronze'
        else 'gray'
      end
    ) as frame_code,
    coalesce(
      member_role.role_label,
      case
        when coalesce(contrib.contribution_count, 0) > 100 or coalesce(profile.created_at, review.created_at) <= now() - interval '1 year' then 'مساهم ذهبي'
        when coalesce(contrib.contribution_count, 0) > 50 then 'مساهم فضي'
        when coalesce(contrib.contribution_count, 0) > 10 then 'مساهم برونزي'
        else 'عضو جديد'
      end
    ) as role_label
  from public.site_reviews review
  left join public.member_profiles profile on profile.id = review.user_id
  left join public.directory_member_roles member_role on member_role.user_id = review.user_id and member_role.active = true
  left join lateral (
    select count(*)::int as contribution_count
    from public.directory_contributions contribution
    where contribution.submitted_by_user_id = review.user_id
      and contribution.status <> 'rejected'
  ) contrib on true
  where review.status = 'published'
  order by review.created_at desc
  limit 100;
$function$;

grant execute on function public.get_public_site_reviews() to anon, authenticated;
