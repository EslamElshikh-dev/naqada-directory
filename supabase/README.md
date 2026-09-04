# Supabase backend — Naqada Directory

Project: `naqada-directory` (Supabase Free plan)

## Public intake

The website sends contributions and privacy-filtered usage events to the `directory-intake` Edge Function. The browser does **not** receive a service-role key and does not read/write database tables directly.

Tracked event families:

- search
- zero_results
- listing_call
- listing_whatsapp
- listing_map
- listing_share

Contribution request types:

- add
- correction
- missing

## Private operational views

The `insights` schema is not granted to `anon` or `authenticated` roles. It contains internal views for manual review from trusted Supabase tooling:

- `insights.zero_result_demand` — repeated searches with no result.
- `insights.listing_conversion_summary` — calls, WhatsApp, map opens and shares per listing.
- `insights.contribution_queue_summary` — moderation workload by status/type/area.
- `insights.daily_activity` — daily searches, zero-result rate, conversions and contributions.
- `insights.search_demand_by_area` — demand and gaps by category/locality.

## Data retention

A Postgres Cron job named `naqada-data-retention` runs daily at `03:15 UTC`:

- request-limit rows older than 2 days are deleted;
- optional contribution contact values are cleared after 90 days;
- usage-event rows older than 180 days are deleted.

Do not commit Supabase secret keys or service-role credentials to this repository.
