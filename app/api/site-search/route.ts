import { NextRequest, NextResponse } from 'next/server';
import { sanitizeSiteSearchQuery, searchSite } from '@/lib/site-search';

export const dynamic = 'force-dynamic';

const cacheHeaders = { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' };

export async function GET(request: NextRequest) {
  const query = sanitizeSiteSearchQuery(request.nextUrl.searchParams.get('q'));
  return NextResponse.json({ items: searchSite(query, 8) }, { headers: cacheHeaders });
}
