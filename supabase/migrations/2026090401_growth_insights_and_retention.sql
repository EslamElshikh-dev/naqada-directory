-- Private reporting views for Naqada Directory growth and moderation.
create schema if not exists insights;
revoke all on schema insights from public, anon, authenticated;

create or replace view insights.zero_result_demand
with (security_invoker = true)
as
select
  coalesce(nullif(trim(query_text), ''), '(بدون نص محفوظ)') as query_text,
  coalesce(category, 'all') as category,
  coalesce(locality, 'all') as locality,
  count(*)::bigint as searches,
  max(created_at) as last_seen
from public.directory_events
where event_type = 'zero_results'
group by 1,2,3
order by searches desc, last_seen desc;

create or replace view insights.listing_conversion_summary
with (security_invoker = true)
as
select
  listing_slug,
  coalesce(category, 'غير محدد') as category,
  coalesce(locality, 'غير محدد') as locality,
  count(*) filter (where event_type = 'listing_call')::bigint as calls,
  count(*) filter (where event_type = 'listing_whatsapp')::bigint as whatsapp,
  count(*) filter (where event_type = 'listing_map')::bigint as map_opens,
  count(*) filter (where event_type = 'listing_share')::bigint as shares,
  count(*)::bigint as total_actions,
  max(created_at) as last_action_at
from public.directory_events
where listing_slug is not null
  and event_type in ('listing_call','listing_whatsapp','listing_map','listing_share')
group by listing_slug, category, locality
order by total_actions desc, last_action_at desc;

create or replace view insights.contribution_queue_summary
with (security_invoker = true)
as
select
  status,
  request_type,
  coalesce(category, 'غير محدد') as category,
  coalesce(locality, 'غير محدد') as locality,
  count(*)::bigint as requests,
  min(created_at) as oldest_request_at,
  max(created_at) as newest_request_at
from public.directory_contributions
group by status, request_type, category, locality
order by
  case status when 'pending' then 0 when 'reviewing' then 1 else 2 end,
  oldest_request_at asc;

create or replace view insights.daily_activity
with (security_invoker = true)
as
with event_daily as (
  select
    created_at::date as day,
    count(*) filter (where event_type = 'search')::bigint as searches,
    count(*) filter (where event_type = 'zero_results')::bigint as zero_results,
    count(*) filter (where event_type = 'listing_call')::bigint as calls,
    count(*) filter (where event_type = 'listing_whatsapp')::bigint as whatsapp,
    count(*) filter (where event_type = 'listing_map')::bigint as map_opens,
    count(*) filter (where event_type = 'listing_share')::bigint as shares
  from public.directory_events
  group by created_at::date
), contribution_daily as (
  select created_at::date as day, count(*)::bigint as contributions
  from public.directory_contributions
  group by created_at::date
), days as (
  select day from event_daily
  union
  select day from contribution_daily
)
select
  d.day,
  coalesce(e.searches, 0) as searches,
  coalesce(e.zero_results, 0) as zero_results,
  case when coalesce(e.searches,0) + coalesce(e.zero_results,0) > 0
       then round((coalesce(e.zero_results,0)::numeric / (coalesce(e.searches,0) + coalesce(e.zero_results,0))) * 100, 2)
       else 0 end as zero_result_rate_pct,
  coalesce(e.calls, 0) as calls,
  coalesce(e.whatsapp, 0) as whatsapp,
  coalesce(e.map_opens, 0) as map_opens,
  coalesce(e.shares, 0) as shares,
  coalesce(c.contributions, 0) as contributions
from days d
left join event_daily e using(day)
left join contribution_daily c using(day)
order by d.day desc;

create or replace view insights.search_demand_by_area
with (security_invoker = true)
as
select
  coalesce(category, 'all') as category,
  coalesce(locality, 'all') as locality,
  count(*)::bigint as searches,
  count(*) filter (where event_type = 'zero_results')::bigint as zero_results,
  round(
    (count(*) filter (where event_type = 'zero_results')::numeric / nullif(count(*),0)) * 100,
    2
  ) as zero_result_rate_pct,
  max(created_at) as last_seen
from public.directory_events
where event_type in ('search','zero_results')
group by category, locality
order by zero_results desc, searches desc, last_seen desc;

revoke all on all tables in schema insights from public, anon, authenticated;
grant usage on schema insights to service_role;
grant select on all tables in schema insights to service_role;

-- Free Postgres cron retention job: minimize data kept longer than needed.
create extension if not exists pg_cron;

select cron.schedule(
  'naqada-data-retention',
  '15 3 * * *',
  $cron$
    delete from public.public_request_limits
    where window_started < now() - interval '2 days';

    update public.directory_contributions
    set contact = null
    where contact is not null
      and created_at < now() - interval '90 days';

    delete from public.directory_events
    where created_at < now() - interval '180 days';
  $cron$
);
