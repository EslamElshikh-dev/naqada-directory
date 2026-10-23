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

The local test runs PostgreSQL 18.3 through PGlite 0.5.8. Managed production uses
PostgreSQL 17.6. A full Docker Supabase / managed PostgREST acceptance run is a
separate deployment check; the tests here verify database schema and access rules.

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
