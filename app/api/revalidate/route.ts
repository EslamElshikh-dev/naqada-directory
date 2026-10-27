import { timingSafeEqual } from 'node:crypto';
import { invalidatePublicContent } from '@/lib/public-content-cache';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.CONTENT_REVALIDATION_SECRET || '';
  if (secret.length < 32) return Response.json({ error: 'Revalidation is not configured' }, { status: 503 });
  const expected = Buffer.from('Bearer ' + secret);
  const actual = Buffer.from(request.headers.get('authorization') || '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  invalidatePublicContent();
  return Response.json({ revalidated: true });
}
