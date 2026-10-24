import { NextRequest, NextResponse } from 'next/server';
import { buildSearchContext } from '@/lib/search-context';
import { recoverSiteSearch, sanitizeSiteSearchQuery, searchSite } from '@/lib/site-search';
import { getPublicEditorialPosts, getPublicRoleModels } from '@/lib/article-content';
import { getPublicBusinessCatalog } from '@/lib/curated-content';

export const dynamic = 'force-dynamic';

const cacheHeaders = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const query = sanitizeSiteSearchQuery(request.nextUrl.searchParams.get('q'));
  if (query.length < 2) return NextResponse.json({ items: [], suggestions: [] }, { headers: cacheHeaders });
  try {
    const [catalog, people, posts] = await Promise.all([getPublicBusinessCatalog(), getPublicRoleModels(), getPublicEditorialPosts()]);
    const items = searchSite(query, 8, undefined, catalog.businesses, { people, posts });
    const context = buildSearchContext(query);
    const quickItems = context
      ? [context, ...items.filter((item) => item.href !== context.href)].slice(0, 8)
      : items;
    const suggestions = quickItems.length ? [] : recoverSiteSearch(query, undefined, 2, catalog.businesses, { people, posts });
    return NextResponse.json({ items: quickItems, suggestions }, { headers: cacheHeaders });
  } catch {
    console.warn('public_search_unavailable');
    return NextResponse.json({ items: [], suggestions: [], error: 'تعذّر البحث دلوقت. جرّب مرة تانية.' }, { status: 503, headers: cacheHeaders });
  }
}
