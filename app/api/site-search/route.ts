import { NextRequest, NextResponse } from 'next/server';
import { recoverSiteSearch, sanitizeSiteSearchQuery, searchSite } from '@/lib/site-search';

export const dynamic = 'force-dynamic';

const cacheHeaders = { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' };

export async function GET(request: NextRequest) {
  const query = sanitizeSiteSearchQuery(request.nextUrl.searchParams.get('q'));
  const items = searchSite(query, 8);
  const suggestions = items.length ? [] : recoverSiteSearch(query, undefined, 2);
  return NextResponse.json({ items, suggestions }, { headers: cacheHeaders });
}
