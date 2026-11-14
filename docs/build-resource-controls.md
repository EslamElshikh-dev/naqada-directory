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

The documentation-only follow-up `d8809e2c6cd6fb4ed29294f2ec558862e1a6b0ff` correctly canceled its Vercel preview before dependency installation with `skip_preview_docs_tests_only`. GitHub verification still ran. Production must build normally, and application changes such as the publication-date prerequisite below must also build.

## Publication date prerequisite

The preview's content-consistency check found an existing archive record with an empty payload publication date: its list card uses the valid source date, while its detail page previously kept the empty archive value. After approval, detail reads now restore only a missing/invalid date from the same publisher article in the existing cached live feed. A valid archive date remains authoritative, all other snapshot fields remain intact, and the hidden-item check still runs first. Source failures preserve archive access; an unavailable original date is never replaced by the current time or the archive ingestion timestamp. No database rows, cache keys, lifetimes or source-fetch schedules change.
