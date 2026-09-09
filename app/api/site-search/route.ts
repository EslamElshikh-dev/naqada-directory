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
  fields: {
    title: string;
    category?: string;
    subcategory?: string;
    locality?: string;
    address?: string;
    auxiliary?: string;
  };
};

type IndexedSearchItem = SearchItem & {
  normalized: {
    title: string;
    category: string;
    subcategory: string;
    locality: string;
    address: string;
    auxiliary: string;
    all: string;
  };
};

const pages: SearchItem[] = [
  { kind: 'page', title: 'دليل الخدمات والأنشطة', subtitle: 'كل الأنشطة المنشورة في مركز نقادة', href: '/directory', badge: 'صفحة', fields: { title: 'دليل الخدمات والأنشطة', auxiliary: 'دليل خدمات أنشطة بحث' } },
  { kind: 'page', title: 'معالم نقادة', subtitle: 'المعالم السياحية والتراثية بالصور', href: '/landmarks', badge: 'صفحة', fields: { title: 'معالم نقادة', auxiliary: 'معالم سياحة آثار صور' } },
  { kind: 'page', title: 'قرى ونجوع نقادة', subtitle: 'استكشف نطاق مركز نقادة حسب المكان', href: '/villages', badge: 'صفحة', fields: { title: 'قرى ونجوع نقادة', auxiliary: 'قرى نجوع أماكن مركز نقادة' } },
  { kind: 'page', title: 'أضف أو صحح نشاطًا', subtitle: 'ساهم في تحديث بيانات الدليل', href: '/contribute', badge: 'مشاركة', fields: { title: 'أضف أو صحح نشاطًا', auxiliary: 'اضافة نشاط تصحيح بيانات مساهمة' } },
  { kind: 'page', title: 'مدونة دليل نقادة', subtitle: 'مقالات وموضوعات محلية', href: '/blog', badge: 'محتوى', fields: { title: 'مدونة دليل نقادة', auxiliary: 'مدونة مقالات اخبار محتوى' } },
];

const synonymGroups = [
  ['دكتور', 'طبيب', 'عياده'],
  ['دكتوره', 'طبيبه', 'عياده'],
  ['موبايل', 'محمول', 'تليفون', 'تلفون', 'هاتف', 'هواتف'],
  ['حضانه', 'حضانات'],
  ['معمل', 'معامل', 'مختبر', 'تحاليل'],
  ['نجار', 'نجاره'],
  ['كوافير', 'صالون', 'تجميل'],
] as const;

const synonymMap = new Map<string, string[]>();
for (const group of synonymGroups) {
  const normalizedGroup = [...new Set(group.map((value) => normalizeArabic(value)))];
  for (const token of normalizedGroup) synonymMap.set(token, normalizedGroup);
}

function normalizeField(value?: string | null) {
  return normalizeArabic(value || '');
}

function indexItem(item: SearchItem): IndexedSearchItem {
  const normalized = {
    title: normalizeField(item.fields.title),
    category: normalizeField(item.fields.category),
    subcategory: normalizeField(item.fields.subcategory),
    locality: normalizeField(item.fields.locality),
    address: normalizeField(item.fields.address),
    auxiliary: normalizeField(item.fields.auxiliary),
    all: '',
  };
  normalized.all = [normalized.title, normalized.category, normalized.subcategory, normalized.locality, normalized.address, normalized.auxiliary].filter(Boolean).join(' ');
  return { ...item, normalized };
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

function variantsFor(token: string) {
  return synonymMap.get(token) || [token];
}

function fieldScore(field: string, variants: string[], exactWeight: number, prefixWeight: number, containsWeight: number) {
  let best = 0;
  for (const variant of variants) {
    if (!variant || !field) continue;
    if (field === variant) best = Math.max(best, exactWeight);
    else if (field.startsWith(`${variant} `) || field.startsWith(variant)) best = Math.max(best, prefixWeight);
    else if (` ${field} `.includes(` ${variant} `)) best = Math.max(best, Math.round((prefixWeight + containsWeight) / 2));
    else if (field.includes(variant)) best = Math.max(best, containsWeight);
  }
  return best;
}

function scoreItem(item: IndexedSearchItem, normalizedQuery: string, tokens: string[]) {
  const { normalized } = item;
  let score = 0;

  if (normalized.title === normalizedQuery) score += 240;
  else if (normalized.title.startsWith(normalizedQuery)) score += 150;
  else if (normalized.title.includes(normalizedQuery)) score += 105;

  if (normalized.locality === normalizedQuery) score += 180;
  else if (normalized.locality.startsWith(normalizedQuery)) score += 95;
  else if (normalized.locality.includes(normalizedQuery)) score += 60;

  if (normalized.subcategory === normalizedQuery) score += 150;
  else if (normalized.subcategory.includes(normalizedQuery)) score += 75;

  if (normalized.category === normalizedQuery) score += 135;
  else if (normalized.category.includes(normalizedQuery)) score += 65;

  if (normalized.all.includes(normalizedQuery)) score += 32;

  for (const token of tokens) {
    const variants = variantsFor(token);
    const title = fieldScore(normalized.title, variants, 54, 38, 25);
    const subcategory = fieldScore(normalized.subcategory, variants, 38, 28, 18);
    const category = fieldScore(normalized.category, variants, 34, 24, 16);
    const locality = fieldScore(normalized.locality, variants, 38, 28, 18);
    const address = fieldScore(normalized.address, variants, 15, 10, 6);
    const auxiliary = fieldScore(normalized.auxiliary, variants, 14, 9, 5);
    const best = Math.max(title, subcategory, category, locality, address, auxiliary);
    if (!best) return -1;
    score += best + Math.round((title + subcategory + category + locality) * 0.12);
  }

  if (tokens.length > 1 && tokens.every((token) => normalized.title.includes(token))) score += 35;
  if (item.kind === 'listing') score += 6;
  return score;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim().replace(/\s+/g, ' ').slice(0, 100) || '';
  if (query.length < 2) return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' } });

  const normalizedQuery = normalizeArabic(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const seen = new Set<string>();
  const items = searchIndex
    .map((item) => ({ item, rank: scoreItem(item, normalizedQuery, tokens) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title, 'ar'))
    .map(({ item }) => item)
    .filter((item) => !seen.has(item.href) && Boolean(seen.add(item.href)))
    .slice(0, 8)
    .map(({ kind, title, subtitle, href, badge }) => ({ kind, title, subtitle, href, badge }));

  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' } });
}
