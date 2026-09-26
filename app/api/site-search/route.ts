import { NextRequest, NextResponse } from 'next/server';
import { buildSearchContext } from '@/lib/search-context';
import { recoverSiteSearch, sanitizeSiteSearchQuery, searchSite } from '@/lib/site-search';
import { getPublishedOwnerListings } from '@/lib/owner-listings';
import { searchOwnerListings } from '@/lib/owner-listing-search';

export const dynamic = 'force-dynamic';

const cacheHeaders = { 'Cache-Control': 'public, max-age=0, s-maxage=60' };

export async function GET(request: NextRequest) {
  const query = sanitizeSiteSearchQuery(request.nextUrl.searchParams.get('q'));
  const items = [...searchOwnerListings(query, await getPublishedOwnerListings(), 8), ...searchSite(query, 8)].slice(0, 8);
  const context = buildSearchContext(query);
  const quickItems = context
    ? [context, ...items.filter((item) => item.href !== context.href)].slice(0, 8)
    : items;
  const suggestions = quickItems.length ? [] : recoverSiteSearch(query, undefined, 2);
  return NextResponse.json({ items: quickItems, suggestions }, { headers: cacheHeaders });
}
