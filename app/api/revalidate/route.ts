import { after } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { invalidatePublicContent, PUBLIC_READ_TIMEOUT_MS, revalidationScopes, type PublicContentScope } from '@/lib/public-content-cache';

type RevalidationLogContext = {
  contract: 'scoped' | 'legacy';
  source: 'supabase' | 'authenticated';
  scopes: readonly PublicContentScope[];
};

function recordRevalidation(context: RevalidationLogContext, phase: 'request' | 'immediate' | 'delayed', result: 'completed' | 'failed' | 'no_changes', startedAt: number) {
  try {
    // Fixed enums and validated scope names only. Never log request bodies,
    // headers, versions, record IDs, errors or credentials. Diagnostics must
    // never prevent an invalidation, response or outbox acknowledgement.
    console.info('PUBLIC_CONTENT_REVALIDATION', {
      contract: context.contract, source: context.source, scopes: [...context.scopes],
      reason: result === 'no_changes' ? 'no_public_changes' : context.contract === 'legacy' ? 'legacy_request' : 'scoped_request',
      phase, result, durationMs: Math.max(0, Date.now() - startedAt),
    });
  } catch { /* Logging is best-effort; preserve the original cache behavior. */ }
}

function invalidateAndRecord(context: RevalidationLogContext, phase: 'immediate' | 'delayed') {
  const startedAt = Date.now();
  try { invalidatePublicContent(context.scopes); }
  catch (error) { recordRevalidation(context, phase, 'failed', startedAt); throw error; }
  recordRevalidation(context, phase, 'completed', startedAt);
}

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.CONTENT_REVALIDATION_SECRET || '';
  if (secret.length < 32) return Response.json({ error: 'Revalidation is not configured' }, { status: 503 });
  const expected = Buffer.from('Bearer ' + secret);
  const actual = Buffer.from(request.headers.get('authorization') || '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Older authenticated callers (including the withdrawal QA) send no body.
  const body = await request.text().then(text => text.trim() ? JSON.parse(text) : {}).catch(() => null);
  const scopes = revalidationScopes(body);
  if (!scopes) return Response.json({ error: 'Invalid revalidation scopes' }, { status: 400 });
  const context: RevalidationLogContext = {
    contract: Object.prototype.hasOwnProperty.call(body, 'scopes') ? 'scoped' : 'legacy',
    source: body.source === 'supabase' ? 'supabase' : 'authenticated',
    scopes: [...scopes],
  };
  if (!scopes.length) {
    recordRevalidation(context, 'request', 'no_changes', Date.now());
    return Response.json({ revalidated: false, scopes });
  }
  invalidateAndRecord(context, 'immediate');
  // A read that started before the mutation can finish after the first purge.
  // Retain the second purge after the bounded read/retry window, for these same
  // scopes only. Do not broaden it to unrelated content.
  after(async () => { await new Promise(resolve => setTimeout(resolve,Math.max(20000,PUBLIC_READ_TIMEOUT_MS*2+2000))); invalidateAndRecord(context, 'delayed'); });
  return Response.json({ revalidated: true, scopes });
}
