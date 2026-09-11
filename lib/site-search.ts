import { businesses, categories, landmarks, localities } from '@/lib/data';
import { knowledgeHeritage, knowledgePeople, knowledgePlaces } from '@/lib/knowledge';
import {
  normalizeSearchFields,
  prepareSearchQuery,
  scoreNormalizedSearchFields,
  type NormalizedSearchFields,
  type SearchRankingFields,
} from '@/lib/search-ranking';

export type SiteSearchKind =
  | 'listing'
  | 'category'
  | 'locality'
  | 'landmark'
  | 'page'
  | 'knowledge-place'
  | 'knowledge-person'
  | 'knowledge-heritage';

export type SiteSearchResult = {
  kind: SiteSearchKind;
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

type SearchItem = SiteSearchResult & {
  fields: SearchRankingFields;
};

type IndexedSearchItem = SearchItem & { normalized: NormalizedSearchFields };

const pages: SearchItem[] = [
  { kind: 'page', title: 'دليل الخدمات والأنشطة', subtitle: 'كل الأنشطة المنشورة في مركز نقادة', href: '/directory', badge: 'صفحة', fields: { title: 'دليل الخدمات والأنشطة', auxiliary: 'دليل خدمات أنشطة بحث' } },
  { kind: 'page', title: 'موسوعة نقادة', subtitle: 'المكان والناس والتراث بالمصدر والإسناد', href: '/knowledge', badge: 'موسوعة', fields: { title: 'موسوعة نقادة', auxiliary: 'معرفة تاريخ تراث أعلام شخصيات أماكن مراجع' } },
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
  ...knowledgePlaces.map((item): SearchItem => ({
    kind: 'knowledge-place',
    title: item.name,
    subtitle: [item.type, item.parent ? `يتبع ${item.parent}` : 'مركز نقادة'].filter(Boolean).join(' · '),
    href: `/knowledge/places/${item.slug}`,
    badge: 'موسوعة · مكان',
    fields: {
      title: item.name,
      category: item.type,
      locality: item.shortName || item.name,
      auxiliary: `${item.parent || 'مركز نقادة'} موسوعة نقادة مكان قرية نجع عزبة`,
    },
  })),
  ...knowledgePeople.map((item): SearchItem => ({
    kind: 'knowledge-person',
    title: item.name,
    subtitle: [...item.professionTags.slice(0, 2), ...item.placeTags.slice(0, 2)].join(' · ') || item.group,
    href: `/knowledge/people/${item.slug}`,
    badge: 'موسوعة · علم',
    fields: {
      title: item.name,
      category: item.group,
      subcategory: item.professionTags.join(' '),
      locality: item.placeTags.join(' '),
      auxiliary: `موسوعة نقادة أعلام شخصيات ${item.professionTags.join(' ')} ${item.placeTags.join(' ')}`,
    },
  })),
  ...knowledgeHeritage.map((item): SearchItem => ({
    kind: 'knowledge-heritage',
    title: item.name,
    subtitle: item.category,
    href: `/knowledge/heritage/${item.slug}`,
    badge: 'موسوعة · تراث',
    fields: {
      title: item.name,
      category: item.category,
      auxiliary: 'موسوعة نقادة تراث تاريخ آثار معالم موضوعات تراثية',
    },
  })),
  ...pages,
].map(indexItem);

export function sanitizeSiteSearchQuery(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, ' ').slice(0, 100);
}

export function searchSite(value: string, limit = 8, kinds?: readonly SiteSearchKind[]): SiteSearchResult[] {
  const query = sanitizeSiteSearchQuery(value);
  if (query.length < 2) return [];

  const { normalizedQuery, tokens } = prepareSearchQuery(query);
  const seen = new Set<string>();
  const allowedKinds = kinds?.length ? new Set<SiteSearchKind>(kinds) : null;
  const searchableIndex = allowedKinds ? searchIndex.filter((item) => allowedKinds.has(item.kind)) : searchIndex;
  const safeLimit = Math.max(1, Math.min(limit, searchableIndex.length));

  return searchableIndex
    .map((item) => {
      const baseRank = scoreNormalizedSearchFields(item.normalized, normalizedQuery, tokens);
      return { item, rank: baseRank < 0 ? -1 : baseRank + (item.kind === 'listing' ? 6 : 0) };
    })
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title, 'ar'))
    .map(({ item }) => item)
    .filter((item) => !seen.has(item.href) && Boolean(seen.add(item.href)))
    .slice(0, safeLimit)
    .map(({ kind, title, subtitle, href, badge }) => ({ kind, title, subtitle, href, badge }));
}
