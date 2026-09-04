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
- contribution_prepare
- contribution_copy
- contribution_share
- contribution_contact
- contribution_submitted

Contribution request types:

- add
- correction
- missing

Search text is persisted only for privacy-safe zero-result searches. Email-like or phone-like queries are discarded. Optional contributor contact details are stored only on the contribution row and are never copied into analytics events.

## Access model

`anon` and `authenticated` have no direct table read/write access. RLS remains enabled as defense in depth.

The `directory-intake` Edge Function uses the server-side `service_role` with least-privilege grants:

- `directory_contributions`: `SELECT`, `INSERT` only;
- `directory_events`: `INSERT` only;
- `public_request_limits`: no direct table access;
- `consume_public_rate_limit(...)`: `EXECUTE` only.

The rate-limit function is `SECURITY DEFINER`, so the Edge Function does not need direct access to the rate-limit table. Do not broaden these grants to work around an application bug.

## Private operational views

The `insights` schema is not granted to `anon` or `authenticated` roles. It contains internal views for manual review from trusted Supabase tooling:

- `insights.zero_result_demand` — repeated searches with no result.
- `insights.listing_conversion_summary` — calls, WhatsApp, map opens and shares per listing.
- `insights.contribution_queue_summary` — moderation workload by status/type/area.
- `insights.daily_activity` — daily searches, zero-result rate, conversions and contributions.
- `insights.search_demand_by_area` — demand and gaps by category/locality.
- `insights.pending_contributions` — actionable moderation queue with source/details and a computed review priority. Corrections rank highest, then missing-result requests, then new additions; a supporting source and request age increase priority.
- `insights.moderation_overview` — pending/reviewing/approved/rejected counts plus stale pending requests and oldest/latest timestamps.
- `insights.contribution_funnel_30d` — privacy-safe 30-day funnel from prepared request to submitted request, grouped by `add`, `correction`, or `missing` and deduplicated by the per-tab session hint.

Use the Supabase SQL editor or other trusted tooling as the internal moderation cockpit. Do not expose these views through a public admin page.

## CI smoke test

The GitHub Actions quality gate performs a no-write Edge Function smoke test after tests, lint, and build. It checks CORS/preflight and sends a honeypot payload. The honeypot response happens before rate-limit consumption or database inserts, so CI does not create analytics, moderation, or rate-limit rows.

## Data retention

A Postgres Cron job named `naqada-data-retention` runs daily at `03:15 UTC`:

- request-limit rows older than 2 days are deleted;
- optional contribution contact values are cleared after 90 days;
- usage-event rows older than 180 days are deleted.

Do not commit Supabase secret keys or service-role credentials to this repository.
