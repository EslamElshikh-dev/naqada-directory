# CSP, caching and invalidation

Public documents use ISR for one hour; article details use one day. Only public
reads have a tagged shared data cache. Session, account, consent and notifications
are client islands; authenticated/editor reads remain uncached. Filtered directory,
news and jobs requests rewrite to dynamic documents while preserving the public URL.

The original dynamic rendering came from explicit force-dynamic exports and
connection() inside public catalog reads, not from session access in the root layout.

Dynamic documents receive a fresh 128-bit nonce and strict-dynamic through proxy.ts
(the Next 16 proxy convention replaces middleware.ts). The policy is passed into
the request so Next can nonce its framework scripts. Public ISR retains an explicit
unsafe-inline exception for inline Flight payloads that change after regeneration.
Per-request nonces require dynamic rendering; reusing a cached nonce is not a safe
substitute. First-party static bootstraps are external files with SHA-256 SRI.
Those hashes do not cover changing inline Flight payloads. Therefore removal of
unsafe-inline from every public page is **not complete**. Script attributes remain
blocked. Facebook hosts remain only because the consent-gated pixel is retained.

Official references: https://nextjs.org/docs/app/guides/content-security-policy
and https://nextjs.org/docs/app/guides/incremental-static-regeneration .

Supabase triggers send a version and source only. A Vault bearer secret is shared
with Vercel via CONTENT_REVALIDATION_SECRET, never committed. The dispatcher retries
failed delivery every minute. Delivery to the current production deployment returns
503 until it is redeployed with the configured environment and this implementation.
The retry task remains active. Live Vercel cache hits and delivery must be checked
after publication; local x-nextjs-cache HIT is not evidence of x-vercel-cache HIT.

The authenticated webhook expires the tag and document layout immediately, then
expires them again after older reads have had time to finish. Public source reads
default to a five-second timeout with one idempotent retry. This is bounded eventual
consistency for concurrent ISR regeneration, not an instantaneous withdrawal
guarantee. NAQADA_PUBLIC_READ_TIMEOUT_MS can be set between 5000 and 20000 for a
slower proxy/build environment; the follow-up purge accounts for that interval.
Social images retain no-store. A secret shorter than 32 characters returns 503;
invalid authorization returns 401. CSP reports have bounded size/rate and log no
document URLs or sample scripts.
