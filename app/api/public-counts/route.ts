import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { RequestLimiter } from '@/lib/request-limiter';

export const dynamic = 'force-dynamic';
const limiter = new RequestLimiter(90, 60_000);
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  const rate = limiter.take(request.headers);
  if (!rate.allowed) return Response.json({ error: 'طلبات كثيرة. حاول بعد قليل.' }, { status: 429, headers: { ...headers, 'Retry-After': String(rate.retryAfter) } });
  try {
    const catalog = await getPublicBusinessCatalog();
    return Response.json({ businesses: catalog.businesses.length }, { headers });
  } catch {
    return Response.json({ error: 'العدد غير متاح الآن' }, { status: 503, headers });
  }
}
