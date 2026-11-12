import { after } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { invalidatePublicContent, PUBLIC_READ_TIMEOUT_MS, revalidationScopes } from '@/lib/public-content-cache';

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
  if (!scopes.length) return Response.json({ revalidated: false, scopes });
  invalidatePublicContent(scopes);
  // A read that started before the mutation can finish after the first purge.
  // Retain the second purge after the bounded read/retry window, for these same
  // scopes only. Do not broaden it to unrelated content.
  after(async () => { await new Promise(resolve => setTimeout(resolve,Math.max(20000,PUBLIC_READ_TIMEOUT_MS*2+2000))); invalidatePublicContent(scopes); });
  return Response.json({ revalidated: true, scopes });
}
