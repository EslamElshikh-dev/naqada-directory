import { after } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { invalidatePublicContent, PUBLIC_READ_TIMEOUT_MS } from '@/lib/public-content-cache';

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
  invalidatePublicContent();
  after(async () => { await new Promise(resolve => setTimeout(resolve,Math.max(20000,PUBLIC_READ_TIMEOUT_MS*2+2000))); invalidatePublicContent(); });
  return Response.json({ revalidated: true });
}
