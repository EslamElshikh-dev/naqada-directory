-- Admin-only, first-party discovery reporting. Days follow Naqada local time.
-- Keep the existing visitor analytics RPC intact: production already contains
-- later source-label and Cairo-time fixes that are not present in its baseline file.
create or replace function public.get_naqada_discovery_insights()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := now() - interval '30 days';
  v_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if not public.is_directory_admin() then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'timezone', 'Africa/Cairo',
    'dailySeries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', day_value,
        'visitors', (select count(distinct p.visitor_id) from public.analytics_pageviews p
          where p.occurred_at >= (day_value::timestamp at time zone 'Africa/Cairo')
            and p.occurred_at < ((day_value + 1)::timestamp at time zone 'Africa/Cairo')),
        'newVisitors', (select count(*) from public.analytics_visitors v
          where v.first_seen_at >= (day_value::timestamp at time zone 'Africa/Cairo')
            and v.first_seen_at < ((day_value + 1)::timestamp at time zone 'Africa/Cairo')),
        'views', (select count(*) from public.analytics_pageviews p
          where p.occurred_at >= (day_value::timestamp at time zone 'Africa/Cairo')
            and p.occurred_at < ((day_value + 1)::timestamp at time zone 'Africa/Cairo'))
      ) order by day_value), '[]'::jsonb)
      from (select v_today - (29 - day_index) as day_value
            from generate_series(0, 29) as days(day_index)) local_days
    ),
    'topPages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'path', ranked.path, 'views', ranked.views, 'visitors', ranked.visitors
      ) order by ranked.views desc, ranked.path), '[]'::jsonb)
      from (
        select path, count(*)::bigint as views, count(distinct visitor_id)::bigint as visitors
        from public.analytics_pageviews where occurred_at >= v_start
        group by path order by views desc, path limit 30
      ) ranked
    ),
    'searchSummary', (
      select jsonb_build_object(
        'total', count(*),
        'missed', count(*) filter (where event_type = 'zero_results')
      )
      from public.directory_events
      where created_at >= v_start and event_type in ('search', 'zero_results')
    ),
    'missedSearches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'query', ranked.query_text, 'count', ranked.query_count,
        'category', ranked.category, 'locality', ranked.locality,
        'lastSeenAt', ranked.last_seen
      ) order by ranked.query_count desc, ranked.last_seen desc), '[]'::jsonb)
      from (
        select lower(trim(query_text)) as query_text,
          category, locality, count(*)::bigint as query_count,
          max(created_at) as last_seen
        from public.directory_events
        where created_at >= v_start and event_type = 'zero_results'
          and query_text is not null and char_length(trim(query_text)) >= 2
        group by lower(trim(query_text)), category, locality
        order by query_count desc, last_seen desc limit 30
      ) ranked
    )
  );
end;
$$;

revoke all on function public.get_naqada_discovery_insights() from public, anon;
grant execute on function public.get_naqada_discovery_insights() to authenticated;
notify pgrst, 'reload schema';
