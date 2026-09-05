-- Public member bios on reviews and privacy-conscious first-party visitor analytics.

create table if not exists public.analytics_visitors (
  visitor_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  pageviews integer not null default 0 check (pageviews >= 0),
  first_path text not null check (char_length(first_path) between 1 and 240),
  last_path text not null check (char_length(last_path) between 1 and 240),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 160),
  device_class text not null default 'desktop' check (device_class in ('mobile', 'tablet', 'desktop'))
);

create table if not exists public.analytics_pageviews (
  id bigint generated always as identity primary key,
  visitor_id uuid not null references public.analytics_visitors(visitor_id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  path text not null check (char_length(path) between 1 and 240),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 160),
  device_class text not null check (device_class in ('mobile', 'tablet', 'desktop')),
  occurred_at timestamptz not null default now()
);

create index if not exists analytics_visitors_last_seen_idx on public.analytics_visitors (last_seen_at desc);
create index if not exists analytics_visitors_user_idx on public.analytics_visitors (user_id) where user_id is not null;
create index if not exists analytics_pageviews_occurred_idx on public.analytics_pageviews (occurred_at desc);
create index if not exists analytics_pageviews_visitor_occurred_idx on public.analytics_pageviews (visitor_id, occurred_at desc);
create index if not exists analytics_pageviews_path_occurred_idx on public.analytics_pageviews (path, occurred_at desc);

alter table public.analytics_visitors enable row level security;
alter table public.analytics_pageviews enable row level security;

revoke all on table public.analytics_visitors from public, anon, authenticated;
revoke all on table public.analytics_pageviews from public, anon, authenticated;
revoke all on sequence public.analytics_pageviews_id_seq from public, anon, authenticated;

create or replace function public.record_naqada_visit(
  p_visitor_id uuid,
  p_path text,
  p_referrer_host text default null,
  p_device_class text default 'desktop'
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_path text := left(trim(coalesce(p_path, '/')), 240);
  v_referrer text := nullif(left(lower(trim(coalesce(p_referrer_host, ''))), 160), '');
  v_device text := case when p_device_class in ('mobile', 'tablet', 'desktop') then p_device_class else 'desktop' end;
  v_recent boolean;
begin
  if p_visitor_id is null or v_path !~ '^/[^/].*|^/$' then
    raise exception 'invalid visit';
  end if;
  if v_referrer is not null and v_referrer !~ '^[a-z0-9.-]+$' then
    v_referrer := null;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_visitor_id::text, 0));

  insert into public.analytics_visitors (
    visitor_id, user_id, first_seen_at, last_seen_at, pageviews, first_path, last_path, referrer_host, device_class
  ) values (
    p_visitor_id, v_user_id, now(), now(), 0, v_path, v_path, v_referrer, v_device
  )
  on conflict (visitor_id) do update set
    user_id = coalesce(v_user_id, public.analytics_visitors.user_id),
    last_seen_at = now(),
    last_path = v_path,
    referrer_host = coalesce(public.analytics_visitors.referrer_host, v_referrer),
    device_class = v_device;

  select exists (
    select 1 from public.analytics_pageviews pageview
    where pageview.visitor_id = p_visitor_id
      and pageview.path = v_path
      and pageview.occurred_at >= now() - interval '5 seconds'
  ) into v_recent;

  if not v_recent then
    insert into public.analytics_pageviews (visitor_id, user_id, path, referrer_host, device_class)
    values (p_visitor_id, v_user_id, v_path, v_referrer, v_device);

    update public.analytics_visitors
    set pageviews = pageviews + 1
    where visitor_id = p_visitor_id;
  end if;
end;
$$;

revoke all on function public.record_naqada_visit(uuid, text, text, text) from public;
grant execute on function public.record_naqada_visit(uuid, text, text, text) to anon, authenticated;

drop function if exists public.get_public_site_reviews();
create function public.get_public_site_reviews()
returns table (
  id uuid,
  rating smallint,
  body text,
  author_name text,
  author_bio text,
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
    coalesce(profile.full_name, review.author_name) as author_name,
    profile.bio as author_bio,
    review.created_at,
    review.updated_at,
    coalesce((select auth.uid()) = review.user_id, false) as is_own
  from public.site_reviews review
  left join public.member_profiles profile on profile.id = review.user_id
  where review.status = 'published'
  order by review.created_at desc
  limit 100;
$$;

revoke all on function public.get_public_site_reviews() from public;
grant execute on function public.get_public_site_reviews() to anon, authenticated;

create or replace function public.get_naqada_visitor_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_start_30 timestamptz := now() - interval '30 days';
  v_start_60 timestamptz := now() - interval '60 days';
begin
  if not public.is_directory_admin() then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'generatedAt', v_now,
    'totals', jsonb_build_object(
      'lifetimeVisitors', (select count(*) from public.analytics_visitors),
      'visitorsToday', (select count(distinct visitor_id) from public.analytics_pageviews where occurred_at >= date_trunc('day', v_now)),
      'uniqueVisitors30d', (select count(*) from public.analytics_visitors where last_seen_at >= v_start_30),
      'newVisitors30d', (select count(*) from public.analytics_visitors where first_seen_at >= v_start_30),
      'returningVisitors30d', (select count(*) from public.analytics_visitors where first_seen_at < v_start_30 and last_seen_at >= v_start_30),
      'previousUniqueVisitors30d', (select count(distinct visitor_id) from public.analytics_pageviews where occurred_at >= v_start_60 and occurred_at < v_start_30),
      'pageViews30d', (select count(*) from public.analytics_pageviews where occurred_at >= v_start_30),
      'identifiedVisitors30d', (select count(distinct user_id) from public.analytics_pageviews where occurred_at >= v_start_30 and user_id is not null),
      'members30d', (select count(*) from public.member_profiles where created_at >= v_start_30),
      'members7d', (select count(*) from public.member_profiles where created_at >= v_now - interval '7 days')
    ),
    'dailySeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(day_value, 'YYYY-MM-DD'),
        'visitors', (select count(distinct visitor_id) from public.analytics_pageviews where occurred_at >= day_value and occurred_at < day_value + interval '1 day'),
        'views', (select count(*) from public.analytics_pageviews where occurred_at >= day_value and occurred_at < day_value + interval '1 day')
      ) order by day_value), '[]'::jsonb)
      from generate_series(date_trunc('day', v_now) - interval '13 days', date_trunc('day', v_now), interval '1 day') day_value
    ),
    'topPages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', ranked.path, 'views', ranked.views, 'visitors', ranked.visitors) order by ranked.views desc), '[]'::jsonb)
      from (
        select path, count(*)::bigint as views, count(distinct visitor_id)::bigint as visitors
        from public.analytics_pageviews where occurred_at >= v_start_30
        group by path order by views desc limit 8
      ) ranked
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', ranked.source, 'visitors', ranked.visitors) order by ranked.visitors desc), '[]'::jsonb)
      from (
        select coalesce(nullif(referrer_host, ''), 'direct') as source, count(distinct visitor_id)::bigint as visitors
        from public.analytics_pageviews where occurred_at >= v_start_30
        group by coalesce(nullif(referrer_host, ''), 'direct') order by visitors desc limit 6
      ) ranked
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', ranked.device_class, 'visitors', ranked.visitors) order by ranked.visitors desc), '[]'::jsonb)
      from (
        select device_class, count(distinct visitor_id)::bigint as visitors
        from public.analytics_pageviews where occurred_at >= v_start_30
        group by device_class order by visitors desc
      ) ranked
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object('event', ranked.event_type, 'count', ranked.event_count) order by ranked.event_count desc), '[]'::jsonb)
      from (
        select event_type, count(*)::bigint as event_count
        from public.directory_events where created_at >= v_start_30
        group by event_type order by event_count desc limit 8
      ) ranked
    ),
    'missedSearches', (
      select coalesce(jsonb_agg(jsonb_build_object('query', ranked.query_text, 'count', ranked.query_count) order by ranked.query_count desc), '[]'::jsonb)
      from (
        select query_text, count(*)::bigint as query_count
        from public.directory_events
        where created_at >= v_start_30 and event_type = 'zero_results' and query_text is not null
        group by query_text order by query_count desc limit 8
      ) ranked
    ),
    'identifiedVisitors', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', identified.id,
        'name', identified.full_name,
        'email', identified.email,
        'bio', identified.bio,
        'locality', identified.locality,
        'avatarUrl', identified.avatar_url,
        'lastSeenAt', identified.last_seen_at,
        'pageViews', identified.pageviews,
        'browsers', identified.browsers
      ) order by identified.last_seen_at desc), '[]'::jsonb)
      from (
        select
          member.id,
          coalesce(profile.full_name, nullif(member.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(member.email, ''), '@', 1)) as full_name,
          member.email,
          profile.bio,
          profile.locality,
          coalesce(profile.avatar_url, nullif(member.raw_user_meta_data ->> 'avatar_url', ''), nullif(member.raw_user_meta_data ->> 'picture', '')) as avatar_url,
          max(visitor.last_seen_at) as last_seen_at,
          sum(visitor.pageviews)::bigint as pageviews,
          count(visitor.visitor_id)::bigint as browsers
        from public.analytics_visitors visitor
        join auth.users member on member.id = visitor.user_id
        left join public.member_profiles profile on profile.id = member.id
        group by member.id, profile.full_name, member.raw_user_meta_data, member.email, profile.bio, profile.locality, profile.avatar_url
        order by last_seen_at desc
        limit 12
      ) identified
    )
  );
end;
$$;

revoke all on function public.get_naqada_visitor_analytics() from public, anon;
grant execute on function public.get_naqada_visitor_analytics() to authenticated;

notify pgrst, 'reload schema';
