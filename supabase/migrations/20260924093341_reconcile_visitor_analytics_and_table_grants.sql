-- Attribute each visitor once per 30-day window, and preserve the intended
-- table access model after Supabase stops automatic grants on new public tables.
-- Existing visitor/pageview data is untouched.

revoke all on table public.directory_member_roles from public, anon, authenticated;
grant select on table public.directory_member_roles to authenticated;

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
        select source, count(*)::bigint as visitors
        from (
          select distinct on (visitor_id) visitor_id,
            case
              when referrer_host is null or referrer_host = '' or referrer_host like 'accounts.google.%' then 'direct'
              when referrer_host ~ '(^|[.])google[.]' then 'google_search'
              when referrer_host ~ '(^|[.])bing[.]' then 'bing_search'
              when referrer_host ~ '(^|[.])facebook[.]' or referrer_host ~ '(^|[.])fb[.]' then 'facebook'
              when referrer_host ~ '(^|[.])whatsapp[.]' then 'whatsapp'
              else referrer_host
            end as source
          from public.analytics_pageviews
          where occurred_at >= v_start_30
          order by visitor_id, occurred_at, id
        ) first_visits
        group by source order by visitors desc limit 6
      ) ranked
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', ranked.device_class, 'visitors', ranked.visitors) order by ranked.visitors desc), '[]'::jsonb)
      from (
        select device_class, count(*)::bigint as visitors
        from (
          select distinct on (visitor_id) visitor_id, device_class
          from public.analytics_pageviews
          where occurred_at >= v_start_30
          order by visitor_id, occurred_at, id
        ) first_visits
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
