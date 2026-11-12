# Scoped public-content invalidation

Prepared against main commit `6ec8dec08474172f2b89fe2c66e8390d08e5d7f4`.

## Behavior

- Public data uses seven separate tags: business, owner listings, jobs, curated news, archived news, articles, and role models. A mutation invalidates dependent pages, not the root layout.
- The jobs/news headline endpoints retain explicit invalidation. Dynamic endpoints keep their existing cache policy.
- All moderation invalidations use `{ expire: 0 }`. The webhook still repeats the **same scopes** after the bounded public-read/retry window to clear old reads that finish after the first purge.
- PostgreSQL row triggers compare the public representation. Empty statements, ignored duplicate feed inserts, unpublished changes and job-feed bookkeeping do not enqueue public invalidation. Public timestamps, withdrawals, deletions, hidden curated tombstones, and moves between content kinds remain observable.
- Job-feed status has its own 30-minute cached read. A status read failure does not hide a successfully loaded job board. Job expiry remains checked on every application read.
- The outbox keeps the original serialized version/acknowledgement lock plus the newest version per scope. Acknowledging an older request cannot swallow later changes.
- Webhooks contain scope names and versions only, never record payloads, IDs or owner data.

## Verification

Run the usual checks:

```
npm ci
npm test
npm run lint
npm run typecheck
npm run audit:media
npm run audit:css
npm run build
npm audit --omit=dev --audit-level=high
node scripts/verify-scoped-content-cache.mjs
```

The final script starts the built Next.js production server on local port 3197. Its preload intercepts every non-local upstream fetch and uses temporary synthetic data. It never calls production revalidation or changes the live database. It verifies new jobs/news in ISR HTML and APIs, job withdrawal, hidden news returning 404, and unrelated directory/blog/role-model readers staying cached through immediate and delayed purges. Run only against a disposable local `.next` build because its cache will contain synthetic test data afterward. Rebuild before any separate local production-data QA.

Unit tests also model late pre-withdrawal reads that populate the cache after the first purge. PostgreSQL tests replay all migrations into isolated PGlite and exercise no-op feeds, moderation/deletion, kind changes, timestamp freshness, retries, overlapping requests, backward compatibility and outbox access restrictions.

The upstream news source cache has a separate explicit tag; explicit API path invalidation can still refresh nested source reads under Next.js path dependencies. This change does not promise zero RSS refetches.

## Deployment, only after approval

1. Deploy the application changes first. Legacy database payloads without `scopes` remain supported and conservatively invalidate all seven scopes. Invalid scoped payloads receive HTTP 400 and are not acknowledged.
2. Apply `supabase/migrations/20261112070000_scoped_content_revalidation.sql`. Do not edit or rerun the old migration in its place. Pending legacy work is preserved.
3. Verify newly published and withdrawn content in pages and headline APIs, confirm the outbox catches up, and inspect function errors.
4. Compare Vercel ISR writes and revalidation/function volume over equivalent traffic windows after warm-up. No production saving has been measured by the local tests, and the broad invalidation path has not been proven to be the sole cause of the original write volume.

Neither deployment nor the production database migration was performed during preparation. Indexing, metadata, canonical and sitemap behavior were not changed by this patch.

## Rollback safety

Do not treat an application alias rollback alone as complete. The old deployment uses different persistent data-cache keys and the shared `naqada-public-content` tag. A hide/delete made while the new app is live may not have expired an old deployment's snapshots.

If rollback is necessary:

1. Restore the previous dispatcher and statement-trigger function definitions, including all six original statement triggers (the five original tables plus `directory_business_locations`). Retain the outbox counters, pending work and private scope table. The new application accepts those legacy unscoped messages.
2. Restore the previous application deployment.
3. Immediately request a full authenticated invalidation through the restored application's `/api/revalidate/` endpoint, keeping the bearer secret server-side. Wait for its delayed purge to finish and verify hidden/deleted content and headline APIs before declaring rollback healthy.
4. Confirm outbox acknowledgement and scheduled feed-state notifications. Keeping the new database triggers with the old application would allow feed-status timestamps to lag at the old one-hour cache interval.

This procedure restores behavior, not source content: never restore deleted/hidden records to test rollback. Prior data-cache snapshots must be invalidated rather than trusted.
