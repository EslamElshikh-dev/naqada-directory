import { NextRequest, NextResponse } from 'next/server';
import { buildSearchContext } from '@/lib/search-context';
import { recoverSiteSearch, sanitizeSiteSearchQuery, searchSite } from '@/lib/site-search';
import { getPublicBusinessCatalog } from '@/lib/curated-content';

export const dynamic = 'force-dynamic';

const cacheHeaders = { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' };

export async function GET(request: NextRequest) {
  const query = sanitizeSiteSearchQuery(request.nextUrl.searchParams.get('q'));
  const catalog = await getPublicBusinessCatalog();
  const items = searchSite(query, 8, undefined, catalog.businesses);
  const context = buildSearchContext(query);
  const quickItems = context
    ? [context, ...items.filter((item) => item.href !== context.href)].slice(0, 8)
    : items;
  const suggestions = quickItems.length ? [] : recoverSiteSearch(query, undefined, 2);
  return NextResponse.json({ items: quickItems, suggestions }, { headers: cacheHeaders });
}
