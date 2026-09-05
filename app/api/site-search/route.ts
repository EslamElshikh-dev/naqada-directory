import { NextRequest, NextResponse } from 'next/server';
import { businesses, categories, landmarks, localities } from '@/lib/data';
import { normalizeArabic } from '@/lib/site';

export const dynamic = 'force-dynamic';

type SearchItem = {
  kind: 'listing' | 'category' | 'locality' | 'landmark' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
  searchable: string;
};

const pages: SearchItem[] = [
  { kind: 'page', title: 'دليل الخدمات والأنشطة', subtitle: 'كل الأنشطة المنشورة في مركز نقادة', href: '/directory', badge: 'صفحة', searchable: 'دليل خدمات أنشطة بحث' },
  { kind: 'page', title: 'معالم نقادة', subtitle: 'المعالم السياحية والتراثية بالصور', href: '/landmarks', badge: 'صفحة', searchable: 'معالم سياحة آثار صور' },
  { kind: 'page', title: 'قرى ونجوع نقادة', subtitle: 'استكشف نطاق مركز نقادة حسب المكان', href: '/villages', badge: 'صفحة', searchable: 'قرى نجوع أماكن مركز نقادة' },
  { kind: 'page', title: 'أضف أو صحح نشاطًا', subtitle: 'ساهم في تحديث بيانات الدليل', href: '/contribute', badge: 'مشاركة', searchable: 'اضافة نشاط تصحيح بيانات مساهمة' },
  { kind: 'page', title: 'مدونة دليل نقادة', subtitle: 'مقالات وموضوعات محلية', href: '/blog', badge: 'محتوى', searchable: 'مدونة مقالات اخبار محتوى' },
];

function score(value: string, tokens: string[]) {
  const normalized = normalizeArabic(value);
  if (!tokens.every((token) => normalized.includes(token))) return -1;
  return tokens.reduce((total, token) => total + (normalized.startsWith(token) ? 4 : 1), 0);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim().replace(/\s+/g, ' ').slice(0, 100) || '';
  if (query.length < 2) return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  const tokens = normalizeArabic(query).split(' ').filter(Boolean);
  const pool: SearchItem[] = [
    ...businesses.map((item) => ({
      kind: 'listing' as const,
      title: item.name,
      subtitle: [item.category, item.subcategory, item.locality, item.address].filter(Boolean).join(' · '),
      href: `/listing/${item.slug}`,
      badge: 'نشاط',
      searchable: [item.name, item.normalizedName, item.category, item.subcategory, item.locality, item.address].filter(Boolean).join(' '),
    })),
    ...categories.map((item) => ({ kind: 'category' as const, title: item.name, subtitle: `${item.count.toLocaleString('ar-EG')} نشاطًا منشورًا`, href: `/directory?category=${encodeURIComponent(item.name)}`, badge: 'قسم', searchable: `${item.name} ${item.shortLabel} ${item.description}` })),
    ...localities.filter((item) => item.businessCount > 0).map((item) => ({ kind: 'locality' as const, title: item.name, subtitle: `${item.type} · ${item.businessCount.toLocaleString('ar-EG')} نشاطًا`, href: `/villages/${item.slug}`, badge: item.type, searchable: `${item.name} ${item.type} ${item.scope || ''}` })),
    ...landmarks.map((item) => ({ kind: 'landmark' as const, title: item.name, subtitle: `${item.type} · ${item.locality}`, href: '/landmarks', badge: 'معلم', searchable: `${item.name} ${item.type} ${item.locality} ${item.summary || ''}` })),
    ...pages,
  ];
  const seen = new Set<string>();
  const items = pool
    .map((item) => ({ item, rank: score(`${item.title} ${item.searchable}`, tokens) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title, 'ar'))
    .map(({ item }) => item)
    .filter((item) => !seen.has(item.href) && Boolean(seen.add(item.href)))
    .slice(0, 8)
    .map(({ kind, title, subtitle, href, badge }) => ({ kind, title, subtitle, href, badge }));
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}
