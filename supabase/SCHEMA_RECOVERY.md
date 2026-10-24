# Reproducible Supabase schema

This repository now includes previously missing schema migrations recovered from
Supabase's recorded migration history. Only SQL schema and authorization code was
restored. Production rows, account mappings, activation values and sync-key seeds
are not copied into new environments.

Run `npm run test:database` to rebuild an empty, isolated PostgreSQL database and
exercise actual `anon`, `authenticated` and `service_role` permissions. The test
uses pinned PGlite, real GRANT/REVOKE and RLS, and no default Data API table or
sequence grants. Managed Auth/Storage scaffolding and scheduler/network entrypoints
are local test fixtures; no network calls or production credentials are used.

Historical versions are preserved where recovered from the server. These files
are for reproducible fresh environments, not a request to reapply old migrations
to production. This change does not run `db push`, repair remote migration history,
change production default privileges or deploy Edge Functions. Existing repository
and remote history already contain some differently named historical versions;
do not use a blanket history-repair or `--include-all` deployment to reconcile them.

The local test runs PostgreSQL 18.3 through PGlite 0.5.8. The separate Docker
acceptance test below runs native PostgreSQL 17.6 with real Auth and PostgREST.

## Naqada coverage

All 23 public application tables are rebuilt, including contributor profiles,
account mappings and permission records. Contributor account and permission reads
are limited to their owner; active public contributor profiles remain read-only.
Contribution review-message/status columns and their member column projection
are restored. Internal reviewer notes remain unreadable to members.

The forward constraint migration adds `needs_info` to the fresh-build status set
without changing any rows. The actual contributor client requests only columns
that members can read, so its activity list works without exposing review notes
or broadening grants. Existing review, cover, notification and article SQL tests
run with synthetic identities and rolled-back fixtures. A missing-cover reminder
is counted separately from the single publication notice.

Run the full repository suite with `npm test`. Its existing CI also runs the
new database test. No privileged account or contributor mapping is seeded by the
restored contributor migration; provision trusted identities explicitly.
The old member foundation migration also leaves its admin registry empty on new
installs. An operator must explicitly enroll the intended confirmed Auth account.
This does not remove, update or re-provision any existing production administrator.

## PostgreSQL 17 Auth and Data API acceptance

Run `python3 tests/integration/supabase17/run.py` on a Docker host, or use the
`PostgreSQL 17 Auth and Data API acceptance` GitHub workflow. This uses a standard
free public-repository runner with PostgreSQL 17.6, GoTrue v2.197.0 and PostgREST
v14.18, with no managed project, production secrets or paid branch. Auth installs
its own schema; four synthetic accounts sign up, log in and refresh their tokens.
All 33 application migrations replay from zero public tables, with no implicit
API grants. The workflow always removes its containers, network and data.

HTTP assertions cover contributor mappings/permissions, the exact activity
projection, owner isolation, private review notes/contact columns, `needs_info`
and safe review messages, gold/admin moderation, publication, notification/audit
deduplication and invalid tokens. The original cover, notification, review and
article SQL suites also run on PostgreSQL 17 in isolated transactions.

A read-only managed-catalog audit found that fresh installs were missing server
DML grants formerly supplied by automatic defaults. The forward allowlist repair
explicitly grants the existing service access on 16 named tables. Contributions
remain SELECT/INSERT-only; events remain INSERT-only; rate-limit storage remains
RPC-only. Both replay suites exercise backend access without implicit grants,
and verify private browser data and restricted intake operations stay denied.
The production catalog snapshot is not published in the repository. The fresh
member_profiles DELETE grant stays absent; production has that unused grant,
but no DELETE RLS policy, and this repair does not broaden member permissions.

Limits: Storage schemas and cron/network calls are test scaffolding. Storage
HTTP, email delivery, Edge Functions and a blank managed Supabase project are not
exercised here. Managed production has no pg_graphql extension installed; GraphQL
is not an application dependency. Do not enable it merely for this test. Production
verification is read-only and historical migrations are never replayed there.
