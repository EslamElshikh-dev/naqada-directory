# Conservative build and revalidation diagnostics

## Build decision

`vercel.json` runs `node scripts/ignore-vercel-build.mjs` before dependency installation. Exit `0` means cancel the build; exit `1` means build normally.

Production always builds. A preview may be skipped only for this exact Vercel project and GitHub repository, on a non-main branch with a valid, available, ancestral `VERCEL_GIT_PREVIOUS_SHA` and a matching checkout. That system variable represents the previous successful project/branch deployment; the guard never substitutes `HEAD^`, fetches history, calls an API or reads credentials.

The full diff since the successful baseline must contain only `README.md`, `docs/**` or `tests/**`. Mixed application changes build, including an earlier failed application commit followed by a documentation-only commit. First previews, same-commit redeploys, empty diffs, force-pushed unrelated histories, missing variables/commits and Git/script failures build. `NAQADA_FORCE_BUILD=1` also forces a build. Application, content, asset, dependency, workflow and build configuration changes build normally. Existing GitHub verification workflows are unchanged and still run for documentation/test changes.

For this release, preview-only skipping is deliberately more conservative than skipping documentation builds in production. It preserves production build/deployment behavior while reducing repeated preview work. Canceled Vercel builds can still count toward deployment quotas and concurrency limits; they do not guarantee a fixed saving.

Tests use disposable local Git repositories and never call Vercel, production revalidation or the database:

```
node --test tests/ignored-build.test.mjs tests/scoped-content-cache.test.mjs
```

## Revalidation diagnostics

Authenticated valid webhook requests log `PUBLIC_CONTENT_REVALIDATION` with fixed contract/source/reason/phase/result enums, validated scope names and elapsed milliseconds. An ordinary non-empty request emits one immediate record and one after the existing delayed purge; an empty scope list emits one no-change record. Rejected/unauthorized requests do not add log traffic. The source enum is an authenticated caller's claim, not a separate identity proof.

Bodies, headers, credentials, versions, record IDs, owner data and upstream error text are never logged. Logging is best-effort and a logging failure cannot change the response or prevent either invalidation. Actual invalidation errors still propagate. Scope selection, immediate expiration, responses, the bounded delayed purge and database delivery acknowledgements retain the existing behavior.

No TTL, cache key, tag, database migration, schedule, resource, region or billing setting is changed. Savings must be measured after rollout; these diagnostics alone do not reduce ISR writes.

## Preview verification

On 2026-11-14, preview commit `26dbde5a542b7f1ba935a8c66d32b865603170c3` built successfully on Vercel with the live public data (808 generated pages). Its decision was `build_missing_successful_baseline`, confirming that the first preview is not skipped. The local production-server integration also verified publication, withdrawal, hidden-news 404, API freshness and both purge phases with every upstream intercepted by synthetic fixtures.

This documentation-only follow-up exercises the existing-preview skip path. Review the Vercel build decision and the still-running GitHub verification before production rollout; a canceled documentation-only preview is expected, while production must build normally.
