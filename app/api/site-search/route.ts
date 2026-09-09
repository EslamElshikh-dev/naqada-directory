import { NextRequest, NextResponse } from 'next/server';
import { businesses, categories, landmarks, localities } from '@/lib/data';
import {
  normalizeSearchFields,
  prepareSearchQuery,
  scoreNormalizedSearchFields,
  type NormalizedSearchFields,
  type SearchRankingFields,
} from '@/lib/search-ranking';

export const dynamic = 'force-dynamic';

type SearchItem = {
  kind: 'listing' | 'category' | 'locality' | 'landmark' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
  fields: SearchRankingFields;
};

type IndexedSearchItem = SearchItem & { normalized: NormalizedSearchFields };

const cacheHeaders = { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' };

const pages: SearchItem[] = [
  { kind: 'page', title: 'دليل الخدمات والأنشطة', subtitle: 'كل الأنشطة المنشورة في مركز نقادة', href: '/directory', badge: 'صفحة', fields: { title: 'دليل الخدمات والأنشطة', auxiliary: 'دليل خدمات أنشطة بحث' } },
  { kind: 'page', title: 'معالم نقادة', subtitle: 'المعالم السياحية والتراثية بالصور', href: '/landmarks', badge: 'صفحة', fields: { title: 'معالم نقادة', auxiliary: 'معالم سياحة آثار صور' } },
  { kind: 'page', title: 'قرى ونجوع نقادة', subtitle: 'استكشف نطاق مركز نقادة حسب المكان', href: '/villages', badge: 'صفحة', fields: { title: 'قرى ونجوع نقادة', auxiliary: 'قرى نجوع أماكن مركز نقادة' } },
  { kind: 'page', title: 'أضف أو صحح نشاطًا', subtitle: 'ساهم في تحديث بيانات الدليل', href: '/contribute', badge: 'مشاركة', fields: { title: 'أضف أو صحح نشاطًا', auxiliary: 'اضافة نشاط تصحيح بيانات مساهمة' } },
  { kind: 'page', title: 'مدونة دليل نقادة', subtitle: 'مقالات وموضوعات محلية', href: '/blog', badge: 'محتوى', fields: { title: 'مدونة دليل نقادة', auxiliary: 'مدونة مقالات اخبار محتوى' } },
];

function indexItem(item: SearchItem): IndexedSearchItem {
  return { ...item, normalized: normalizeSearchFields(item.fields) };
}

const searchIndex: IndexedSearchItem[] = [
  ...businesses.map((item): SearchItem => ({
    kind: 'listing',
    title: item.name,
    subtitle: [item.category, item.subcategory, item.locality, item.address].filter(Boolean).join(' · '),
    href: `/listing/${item.slug}`,
    badge: 'نشاط',
    fields: {
      title: item.name,
      category: item.category,
      subcategory: item.subcategory || '',
      locality: item.locality || '',
      address: item.address || '',
      auxiliary: item.normalizedName || '',
    },
  })),
  ...categories.map((item): SearchItem => ({
    kind: 'category',
    title: item.name,
    subtitle: `${item.count.toLocaleString('ar-EG')} نشاطًا منشورًا`,
    href: `/directory?category=${encodeURIComponent(item.name)}`,
    badge: 'قسم',
    fields: { title: item.name, category: item.name, auxiliary: `${item.shortLabel} ${item.description}` },
  })),
  ...localities.filter((item) => item.businessCount > 0).map((item): SearchItem => ({
    kind: 'locality',
    title: item.name,
    subtitle: `${item.type} · ${item.businessCount.toLocaleString('ar-EG')} نشاطًا`,
    href: `/villages/${item.slug}`,
    badge: item.type,
    fields: { title: item.name, locality: item.name, auxiliary: `${item.type} ${item.scope || ''}` },
  })),
  ...landmarks.map((item): SearchItem => ({
    kind: 'landmark',
    title: item.name,
    subtitle: `${item.type} · ${item.locality}`,
    href: '/landmarks',
    badge: 'معلم',
    fields: { title: item.name, category: item.type, locality: item.locality, auxiliary: item.summary || '' },
  })),
  ...pages,
].map(indexItem);

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim().replace(/\s+/g, ' ').slice(0, 100) || '';
  if (query.length < 2) return NextResponse.json({ items: [] }, { headers: cacheHeaders });

  const { normalizedQuery, tokens } = prepareSearchQuery(query);
  const seen = new Set<string>();
  const items = searchIndex
    .map((item) => {
      const baseRank = scoreNormalizedSearchFields(item.normalized, normalizedQuery, tokens);
      return { item, rank: baseRank < 0 ? -1 : baseRank + (item.kind === 'listing' ? 6 : 0) };
    })
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title, 'ar'))
    .map(({ item }) => item)
    .filter((item) => !seen.has(item.href) && Boolean(seen.add(item.href)))
    .slice(0, 8)
    .map(({ kind, title, subtitle, href, badge }) => ({ kind, title, subtitle, href, badge }));

  return NextResponse.json({ items }, { headers: cacheHeaders });
}
