-- Extend directory analytics with a privacy-safe contribution funnel.

alter table public.directory_events
  add column if not exists request_type text;

alter table public.directory_events
  drop constraint if exists directory_events_event_type_check;

alter table public.directory_events
  add constraint directory_events_event_type_check
  check (event_type = any (array[
    'search'::text,
    'zero_results'::text,
    'listing_call'::text,
    'listing_whatsapp'::text,
    'listing_map'::text,
    'listing_share'::text,
    'contribution_prepare'::text,
    'contribution_copy'::text,
    'contribution_share'::text,
    'contribution_contact'::text,
    'contribution_submitted'::text
  ]));

alter table public.directory_events
  drop constraint if exists directory_events_request_type_check;

alter table public.directory_events
  add constraint directory_events_request_type_check
  check (request_type is null or request_type = any (array['add'::text, 'correction'::text, 'missing'::text]));

alter table public.directory_events
  drop constraint if exists directory_events_request_type_event_check;

alter table public.directory_events
  add constraint directory_events_request_type_event_check
  check (request_type is null or event_type like 'contribution_%');

create index if not exists directory_events_contribution_funnel_idx
  on public.directory_events (request_type, event_type, created_at desc)
  where event_type like 'contribution_%';

create or replace view insights.contribution_funnel_30d
with (security_invoker = true)
as
select
  coalesce(request_type, 'unknown') as request_type,
  count(distinct session_hint) filter (where event_type = 'contribution_prepare') as prepared_sessions,
  count(distinct session_hint) filter (where event_type = 'contribution_copy') as copied_sessions,
  count(distinct session_hint) filter (where event_type = 'contribution_share') as shared_sessions,
  count(distinct session_hint) filter (where event_type = 'contribution_contact') as contact_sessions,
  count(distinct session_hint) filter (where event_type = 'contribution_submitted') as submitted_sessions,
  round(
    100.0 * count(distinct session_hint) filter (where event_type = 'contribution_submitted')
    / nullif(count(distinct session_hint) filter (where event_type = 'contribution_prepare'), 0),
    1
  ) as submission_rate_pct
from public.directory_events
where created_at >= now() - interval '30 days'
  and event_type like 'contribution_%'
group by coalesce(request_type, 'unknown')
order by prepared_sessions desc, request_type;

revoke all on insights.contribution_funnel_30d from anon, authenticated;
