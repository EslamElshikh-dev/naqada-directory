# Independent news item caching

Prepared against `6d933ca3acd21148fab8f53b924f491c6a04db2c` after approval of the news-only optimization. Directory/village TTLs, jobs, publisher canonicals, robots and sitemap policy are unchanged.

## Reads and rendered dependencies

- Complete archive snapshots and original editor stories use `public-news-item-v1` with `naqada-public-content:news-items:<public route ID>` and the emergency roll-up `naqada-public-content:news-items`.
- Detail reads use the existing anonymous archive endpoint and public curated-content RPC directly inside the per-item cache. They do not consume the shared news-index cache. The public RPC result contains published representations and empty hidden tombstones only; no editor sessions or draft/owner data enter this cache. React request deduplication can share that public revision read across related items.
- Related links are a separate one-hour selection anchored to the story publication time, with up to six matching archive candidates used to display three visible links. The page also depends on each candidate's item tag, so a correction, hide or deletion refreshes pages displaying that link. New unrelated news does not clear old selections. These useful links remain in server HTML.
- Data/page TTLs remain one hour. Raw item reads use four-second timeouts with the existing one-retry policy, and related selection uses two seconds. Failed reads are not persisted as empty snapshots; unavailable related content does not fail the story.
- Unarchived live stories, incomplete dates and upstream failure fallback preserve existing behavior. In particular, the publication-date reconciliation from #218 remains. These exceptional paths may still depend on live sources; this change does not promise zero feed work for every article.
- The news collection, ticker and archive lists keep their current timers and index tags. A missing archive snapshot is not itself a hide marker: an item still available from the live source can retain the existing live fallback. Explicit hidden curated tombstones always suppress it.

## Backward-compatible invalidation

The authenticated webhook accepts optional `newsItems`, a complete array of 1–100 distinct public news route IDs (ASCII alphanumeric/hyphen, 3–90 characters) alongside `news` and/or `news-archive` scopes. Invalid or empty targeting and targeting with non-news scopes return 400, never acknowledgement. Existing callers without this field still clear all news item snapshots.

News-index tags and `/api/news` always refresh. Targeted messages additionally expire only the provided item tags with `{ expire: 0 }`; broad messages expire the roll-up. The existing delayed second purge repeats exactly those targets. Logs add a bounded item count only, never IDs or payloads. The response remains backward-compatible.

The new private outbox table stores public route IDs and their newest versions. Both old and new IDs are captured for renames and kind moves. The dispatcher keeps the original serialized row lock/version acknowledgement protocol, prunes only acknowledged item versions, and cannot let an older acknowledgement swallow a newer change to the same item. Legacy work, invalid route IDs, missing coverage and batches above 100 fall back to complete broad invalidation; no truncated list is acknowledged as complete. The table has RLS and no anon/authenticated privileges.

## Verification

Run the normal unit/database suite, lint, typecheck, media/CSS audits and production build, then:

```sh
node scripts/verify-news-item-cache.mjs
node scripts/verify-scoped-content-cache.mjs
```

These scripts start local production Next servers and intercept every non-local request. They test actual ISR documents, API/index freshness, unrelated cache HITs through both purges, related-link correction/hiding, hidden/deleted 404s and late in-flight reads. They never send synthetic content or revalidation to hosted services. Their disposable `.next` cache contains fixtures afterward: remove that disposable build including its data cache and rebuild before any unrelated production-data QA. Never deploy this test build with `--prebuilt`; the hosted Git deployment builds independently.

Database tests replay the migrations in isolated PostgreSQL/PGlite and exercise draft-only no-ops, item edits/deletions/renames, kind moves, mixed scopes, concurrent changes, failed delivery, legacy pending work, overflow, repeatability and privilege boundaries.

## Authorized rollout

1. Verify the reviewed preview and commit, then merge/deploy the compatible application first. The existing scoped dispatcher remains safe: a message without `newsItems` uses the roll-up fallback.
2. Record content counts/hashes and queue state. Apply only the new `20261126030223_news_item_revalidation.sql` migration; do not rerun #217's migration.
3. Verify migration text/function hashes, the private table privileges and existing five row triggers. Compare content hashes, accounting for genuine concurrent feed ingestion.
4. Observe a natural scoped delivery, immediate/delayed completion and outbox acknowledgement. Use read-only public checks; do not insert test stories into production.
5. Compare seven-day production writes/1,000 requests by route and crawler mix after warm-up. Local regression success is not a measured saving.

## Rollback

The previous application ignores `newsItems` and still receives the same section scopes, so retaining this backward-compatible dispatcher is safe during application rollback. Keep the private table and counters; never discard pending work. After restoring the previous deployment, perform an authenticated full news invalidation and wait for its delayed purge before checking visibility and canonicals. If restoring database definitions too, restore both dispatcher and content_changed from the prior migration together; do not drop the new table or rewrite content rows. A rollback solely to an older release before #217 additionally requires its separately documented full database/cache rollback procedure.
