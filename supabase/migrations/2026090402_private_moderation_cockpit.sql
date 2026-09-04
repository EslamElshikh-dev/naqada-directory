create or replace view insights.pending_contributions
with (security_invoker = true)
as
select
  id,
  created_at,
  request_type,
  name,
  category,
  locality,
  listing_slug,
  details,
  source_url,
  (contact is not null) as has_contact,
  status,
  case
    when request_type = 'correction' and source_url is not null then 100
    when request_type = 'correction' then 90
    when request_type = 'missing' and source_url is not null then 80
    when request_type = 'missing' then 70
    when request_type = 'add' and source_url is not null then 60
    else 50
  end
  + least(20, floor(extract(epoch from (now() - created_at)) / 86400)::int) as review_priority,
  floor(extract(epoch from (now() - created_at)) / 86400)::int as age_days
from public.directory_contributions
where status in ('pending','reviewing')
order by review_priority desc, created_at asc;

create or replace view insights.moderation_overview
with (security_invoker = true)
as
select
  count(*) filter (where status = 'pending')::bigint as pending,
  count(*) filter (where status = 'reviewing')::bigint as reviewing,
  count(*) filter (where status = 'approved')::bigint as approved,
  count(*) filter (where status = 'rejected')::bigint as rejected,
  count(*) filter (where status = 'pending' and created_at < now() - interval '7 days')::bigint as pending_over_7_days,
  min(created_at) filter (where status = 'pending') as oldest_pending_at,
  max(created_at) as latest_request_at
from public.directory_contributions;

revoke all on insights.pending_contributions from public, anon, authenticated;
revoke all on insights.moderation_overview from public, anon, authenticated;
grant select on insights.pending_contributions, insights.moderation_overview to service_role;
