-- Record form stages without names, email addresses, passwords or phone numbers.
alter table public.directory_events drop constraint directory_events_event_type_check;
alter table public.directory_events add constraint directory_events_event_type_check
  check (event_type = any (array['search'::text, 'zero_results'::text, 'listing_call'::text, 'listing_whatsapp'::text, 'listing_map'::text, 'listing_share'::text, 'contribution_prepare'::text, 'contribution_copy'::text, 'contribution_share'::text, 'contribution_contact'::text, 'contribution_submitted'::text, 'registration_start'::text, 'registration_submit'::text, 'registration_created'::text, 'registration_error'::text, 'confirmation_resend'::text, 'owner_form_start'::text, 'owner_form_submit'::text, 'owner_form_saved'::text, 'owner_form_error'::text, 'owner_photo_error'::text]));

CREATE OR REPLACE FUNCTION public.get_naqada_discovery_insights()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'formFunnel', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'stage', stage.event_type, 'sessions', stage.sessions, 'events', stage.events
      ) order by stage.event_type), '[]'::jsonb)
      from (
        select event_type, count(distinct session_hint)::bigint as sessions, count(*)::bigint as events
        from public.directory_events
        where created_at >= v_start and event_type in ('registration_start', 'registration_submit', 'registration_created', 'registration_error', 'confirmation_resend', 'owner_form_start', 'owner_form_submit', 'owner_form_saved', 'owner_form_error', 'owner_photo_error')
        group by event_type
      ) stage
    ),
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
$function$;

revoke all on function public.get_naqada_discovery_insights() from public, anon;
grant execute on function public.get_naqada_discovery_insights() to authenticated;

-- Publishing a phone-only correction must actually apply that phone first.
-- This invoker trigger runs with the moderation statement's existing privileges.
create or replace function public.ensure_naqada_phone_correction_applied()
returns trigger language plpgsql security invoker set search_path = ''
as $guard$
declare
  v_raw text;
  v_phone text;
  v_published_phone text;
begin
  if new.request_type <> 'correction' or new.status <> 'published' then return new; end if;
  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status and new.details is not distinct from old.details then return new; end if;
  end if;
  v_raw := translate(trim(coalesce(new.details,'')), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  if v_raw !~ '^[+]?[0-9 ()-]+$' then return new; end if;
  v_phone := regexp_replace(v_raw, '[ ()-]', '', 'g');
  if v_phone !~ '^[+]?[0-9]{10,15}$' then return new; end if;
  select payload->>'phone' into v_published_phone from public.directory_curated_content
    where kind='business' and slug=new.listing_slug and status='published';
  if v_published_phone is distinct from v_phone then
    raise exception using errcode='23514', message='phone correction must be applied before publication';
  end if;
  return new;
end;
$guard$;
revoke all on function public.ensure_naqada_phone_correction_applied() from public, anon, authenticated;
create trigger ensure_naqada_phone_correction_applied
before insert or update of status, details on public.directory_contributions
for each row execute function public.ensure_naqada_phone_correction_applied();

notify pgrst, 'reload schema';
