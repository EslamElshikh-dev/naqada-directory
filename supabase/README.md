# Supabase backend — Naqada Directory

Project: `naqada-directory` (Supabase Free plan)

## Public intake

The website sends contributions and privacy-filtered usage events to the `directory-intake` Edge Function. The browser does **not** receive a service-role key and does not read/write database tables directly.

The same function also serves listing rating summaries and accepts one mutable 1–5 score per listing and hashed network identity. Raw IP addresses are never stored. Rating writes are rate-limited and browser roles retain no direct database access.

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
- `directory_ratings`: `SELECT`, `INSERT`, `UPDATE` only;
- `public_request_limits`: no direct table access;
- `consume_public_rate_limit(...)`: `EXECUTE` only.

The rate-limit function is `SECURITY DEFINER`, so the Edge Function does not need direct access to the rate-limit table. Do not broaden these grants to work around an application bug.

## Activities owned by members

`directory_owner_listings` is separate from the open suggestion inbox above. A signed-in member creates an activity with their account ID, category, locality, phone, opening hours, address, description, and up to five photos. RLS allows the owner to read and edit their own records and allows anyone to read only published records. A database trigger keeps the owner ID immutable and sends member edits back to pending review; only a directory admin can publish or reject a record through the protected moderation route.

The `directory-owner-photos` bucket is private, with a 4 MiB per-image limit and JPEG/PNG/WebP restrictions. Storage policies allow the owner to upload to their activity folder, the owner and admin to preview pending photos, and the public to see photos linked to published activities only. The site serves these images through `/api/owner-photos/...` with the caller's auth context. The member-facing form and protected admin queue are at `/contribute` and `/admin/activities`. Published records appear in the directory, search, category pages, and sitemap.

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
