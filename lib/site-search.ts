import { ownerActivityHref } from './activity-path';
import { NUMBER_LOCALE } from '@/lib/format-number';
import { businesses, categories, familySearchPages, landmarks, localities } from '@/lib/data';
import { knowledgeHeritage, knowledgePeople, knowledgePlaces } from '@/lib/knowledge';
import {
  normalizeSearchFields,
  prepareSearchQuery,
  scoreNormalizedSearchFields,
  type NormalizedSearchFields,
  type SearchRankingFields,
} from '@/lib/search-ranking';
import { normalizeArabic } from '@/lib/site';
import { isFamilySearchQuery } from '@/lib/family-search';
import type { Business } from '@/lib/types';
import { roleModels, type RoleModel } from '@/lib/role-models';
import type { EditorialPost } from '@/lib/editorial-posts';
import { jobSearchIntent } from '@/lib/job-search';
import { localitiesWithPublicCounts } from '@/lib/public-localities';

export type SiteSearchKind =
  | 'listing'
  | 'category'
  | 'locality'
  | 'landmark'
  | 'page'
  | 'knowledge-place'
  | 'knowledge-person'
  | 'knowledge-heritage'
  | 'role-model';

export type SiteSearchResult = {
  kind: SiteSearchKind;
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

export type SearchRecoverySuggestion = {
  query: string;
  reason: 'تصحيح إملائي محتمل' | 'بحث أوسع';
  count: number;
};

type SearchItem = SiteSearchResult & {
  fields: SearchRankingFields;
};

type IndexedSearchItem = SearchItem & { normalized: NormalizedSearchFields };

type VocabularyEntry = {
  normalized: string;
  display: string;
  frequency: number;
};

const pages: SearchItem[] = [
  { kind: 'page', title: 'وظائف نقادة وقراها', subtitle: 'فرص عمل قريبة وباحثون عن وظيفة', href: '/jobs', badge: 'وظائف', fields: { title: 'وظائف نقادة', auxiliary: 'شغل فرص عمل مطلوب توظيف وظيفة باحث عن عمل قنا' } },
  { kind: 'page', title: 'دليل الخدمات والأنشطة', subtitle: 'كل الأنشطة المنشورة في مركز نقادة', href: '/directory', badge: 'صفحة', fields: { title: 'دليل الخدمات والأنشطة', auxiliary: 'دليل خدمات أنشطة بحث' } },
  { kind: 'page', title: 'موسوعة نقادة', subtitle: 'المكان والناس والتراث بالمصدر والإسناد', href: '/knowledge', badge: 'موسوعة', fields: { title: 'موسوعة نقادة', auxiliary: 'معرفة تاريخ تراث أعلام شخصيات أماكن مراجع' } },
  { kind: 'page', title: 'معالم نقادة', subtitle: 'المعالم السياحية والتراثية بالصور', href: '/landmarks', badge: 'صفحة', fields: { title: 'معالم نقادة', auxiliary: 'معالم سياحة آثار صور' } },
  { kind: 'page', title: 'قرى ونجوع نقادة', subtitle: 'استكشف نطاق مركز نقادة حسب المكان', href: '/villages', badge: 'صفحة', fields: { title: 'قرى ونجوع نقادة', auxiliary: 'قرى نجوع أماكن مركز نقادة' } },
  { kind: 'page', title: 'أضف نشاطك باسمك', subtitle: 'سجّل بيانات نشاطك وصوره من حسابك', href: '/contribute', badge: 'مشاركة', fields: { title: 'أضف نشاطك باسمك', auxiliary: 'اضافة نشاط تصحيح بيانات مساهمة' } },
  { kind: 'page', title: 'مدونة دليل نقادة', subtitle: 'مقالات وموضوعات محلية', href: '/blog', badge: 'محتوى', fields: { title: 'مدونة دليل نقادة', auxiliary: 'مدونة مقالات اخبار محتوى' } },
  { kind: 'page', title: 'نماذج مشرفة في نقادة', subtitle: 'حكايات أشخاص من نقادة مع مصدر كل قصة', href: '/role-models', badge: 'نماذج', fields: { title: 'نماذج مشرفة في نقادة', auxiliary: 'شخصيات آية رفاعي عبدالشافي نجاح تطوع' } },
];

function indexItem(item: SearchItem): IndexedSearchItem {
  return { ...item, normalized: normalizeSearchFields(item.fields) };
}

const searchIndex: IndexedSearchItem[] = [
  ...familySearchPages.map(indexItem),
  ...businesses.map((item): SearchItem => ({
    kind: 'listing',
    title: item.name,
    subtitle: [item.category, item.subcategory, item.locality, item.address].filter(Boolean).join(' · '),
    href: /^owner[:-]/.test(item.id) ? ownerActivityHref(item) : `/listing/${item.slug}`,
    badge: item.id.startsWith('owner:') ? 'نشاط من صاحبه' : 'نشاط',
    fields: {
      title: item.name,
      category: item.category,
      subcategory: item.subcategory || '',
      locality: item.locality || '',
      address: item.address || '',
      auxiliary: [item.normalizedName, item.description, ...(item.seoKeywords || [])].filter(Boolean).join(' '),
    },
  })),
  ...categories.map((item): SearchItem => ({
    kind: 'category',
    title: item.name,
    subtitle: `${item.count.toLocaleString(NUMBER_LOCALE)} نشاطًا منشورًا`,
    href: `/directory?category=${encodeURIComponent(item.name)}`,
    badge: 'قسم',
    fields: { title: item.name, category: item.name, auxiliary: `${item.shortLabel} ${item.description}` },
  })),
  ...localities.filter((item) => item.businessCount > 0).map((item): SearchItem => ({
    kind: 'locality',
    title: item.name,
    subtitle: `${item.type} · ${item.businessCount.toLocaleString(NUMBER_LOCALE)} نشاطًا`,
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
  ...roleModels.map((person): SearchItem => ({
    kind: 'role-model',
    title: person.name,
    subtitle: person.shortTitle + ' · ' + person.locality,
    href: '/role-models/' + person.slug,
    badge: 'نموذج مشرف',
    fields: { title: person.name, category: 'نماذج مشرفة في نقادة', locality: person.locality, auxiliary: [person.description, ...(person.alternateNames || [])].join(' ') },
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

const vocabulary = buildVocabulary(searchIndex);

function vocabularyTokens(value?: string | null) {
  return (value || '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildVocabulary(index: IndexedSearchItem[]) {
  const entries = new Map<string, VocabularyEntry>();
  for (const item of index) {
    const fields = [item.fields.title, item.fields.category, item.fields.subcategory, item.fields.locality, item.fields.address];
    for (const field of fields) {
      for (const display of vocabularyTokens(field)) {
        const normalized = normalizeArabic(display);
        if (normalized.length < 3 || /^\d+$/.test(normalized)) continue;
        const current = entries.get(normalized);
        if (current) current.frequency += 1;
        else entries.set(normalized, { normalized, display, frequency: 1 });
      }
    }
  }
  return entries;
}

function editDistanceAtMostOne(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    let differences = 0;
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index] && ++differences > 1) return false;
    }
    return true;
  }

  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let shortIndex = 0;
  let longIndex = 0;
  let skipped = false;
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    longIndex += 1;
  }
  return true;
}

function displayToken(token: string, activeVocabulary = vocabulary) {
  return activeVocabulary.get(token)?.display || token;
}

function spellingCandidate(token: string, activeVocabulary = vocabulary) {
  if (token.length < 4 || activeVocabulary.has(token)) return null;
  const candidates = [...activeVocabulary.values()]
    .filter((entry) => entry.normalized[0] === token[0] && editDistanceAtMostOne(token, entry.normalized))
    .sort((a, b) => b.frequency - a.frequency || a.display.localeCompare(b.display, 'ar'));
  return candidates[0] || null;
}

export function sanitizeSiteSearchQuery(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, ' ').slice(0, 100);
}

function activeSearchIndex(currentBusinesses?: Business[], currentContent?: { people: RoleModel[]; posts: EditorialPost[] }) {
  const categoryCounts = new Map<string, number>();
  for (const item of currentBusinesses || []) categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1);
  let activeIndex = currentBusinesses ? [
    ...searchIndex.filter((item) => !['listing', 'category', 'locality'].includes(item.kind)),
    ...categories.filter(item => categoryCounts.has(item.name)).map(item => indexItem({
      kind: 'category', title: item.name, subtitle: `${categoryCounts.get(item.name)!.toLocaleString(NUMBER_LOCALE)} نشاطًا منشورًا`,
      href: `/directory?category=${encodeURIComponent(item.name)}`, badge: 'قسم',
      fields: { title: item.name, category: item.name, auxiliary: `${item.shortLabel} ${item.description}` },
    })),
    ...localitiesWithPublicCounts(localities, currentBusinesses).filter(item => item.businessCount > 0).map(item => indexItem({
      kind: 'locality', title: item.name, subtitle: `${item.type} · ${item.businessCount.toLocaleString(NUMBER_LOCALE)} نشاطًا`,
      href: `/villages/${item.slug}`, badge: item.type,
      fields: { title: item.name, locality: item.name, auxiliary: `${item.type} ${item.scope || ''}` },
    })),
    ...currentBusinesses.map((item) => indexItem({
      kind: 'listing' as const, title: item.name,
      subtitle: [item.category, item.subcategory, item.locality, item.address].filter(Boolean).join(' · '),
      href: /^owner[:-]/.test(item.id) ? ownerActivityHref(item) : `/listing/${item.slug}`,
      badge: item.id.startsWith('owner:') ? 'نشاط من صاحبه' : 'نشاط',
      fields: {
        title: item.name, category: item.category, subcategory: item.subcategory || '',
        locality: item.locality || '', address: item.address || '', auxiliary: [item.normalizedName, item.description, ...(item.seoKeywords || [])].filter(Boolean).join(' '),
      },
    })),
  ] : searchIndex;
  if (currentContent) activeIndex = [
    ...activeIndex.filter(item => item.kind !== 'role-model'),
    ...currentContent.people.map(person => indexItem({ kind: 'role-model', title: person.name, subtitle: person.shortTitle + ' · ' + person.locality, href: '/role-models/' + person.slug, badge: 'نموذج مشرف', fields: { title: person.name, locality: person.locality, category: 'نماذج مشرفة', auxiliary: [person.description, ...(person.alternateNames || [])].join(' ') } })),
    ...currentContent.posts.map(post => indexItem({ kind: 'page', title: post.title, subtitle: post.description, href: '/blog/' + post.slug, badge: 'مقال', fields: { title: post.title, locality: post.locality, category: post.category, auxiliary: post.keywords.join(' ') } })),
  ];
  return activeIndex;
}

export function searchSite(value: string, limit = 8, kinds?: readonly SiteSearchKind[], currentBusinesses?: Business[], currentContent?: { people: RoleModel[]; posts: EditorialPost[] }): SiteSearchResult[] {
  const query = sanitizeSiteSearchQuery(value);
  if (query.length < 2) return [];

  const intent = prepareSearchQuery(query, localities.map((item) => item.name));
  const { normalizedQuery, tokens } = intent;
  const seen = new Set<string>();
  const allowedKinds = kinds?.length ? new Set<SiteSearchKind>(kinds) : null;
  const activeIndex = activeSearchIndex(currentBusinesses, currentContent);
  const familyIntent = isFamilySearchQuery(query);
  const searchableIndex = activeIndex.filter((item) =>
    (!allowedKinds || allowedKinds.has(item.kind))
    && (!familyIntent || item.href === '/families' || item.href.startsWith('/families?')));
  const safeLimit = Math.max(1, Math.min(limit, searchableIndex.length));

  const rankedResults = searchableIndex
    .map((item) => {
      const baseRank = scoreNormalizedSearchFields(item.normalized, normalizedQuery, tokens,
        item.kind === 'listing' ? intent : { serviceTokens: intent.serviceTokens });
      return { item, rank: baseRank < 0 ? -1 : baseRank + (item.kind === 'listing' ? 6 : 0) };
    })
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title, 'ar'))
    .map(({ item }) => item)
    .filter((item) => !seen.has(item.href) && Boolean(seen.add(item.href)))
    .slice(0, safeLimit)
    .map(({ kind, title, subtitle, href, badge }) => ({ kind, title, subtitle, href, badge }));
  const jobIntent = jobSearchIntent(query);
  return jobIntent && (!allowedKinds || allowedKinds.has('page')) && !familyIntent
    ? [jobIntent, ...rankedResults.filter((item) => item.href !== '/jobs')].slice(0, Math.max(1, limit))
    : rankedResults;
}

export function recoverSiteSearch(value: string, kinds?: readonly SiteSearchKind[], limit = 4, currentBusinesses?: Business[], currentContent?: { people: RoleModel[]; posts: EditorialPost[] }): SearchRecoverySuggestion[] {
  const query = sanitizeSiteSearchQuery(value);
  if (query.length < 2 || searchSite(query, 1, kinds, currentBusinesses, currentContent).length) return [];

  const { tokens } = prepareSearchQuery(query);
  if (!tokens.length) return [];

  const activeVocabulary = currentBusinesses || currentContent ? buildVocabulary(activeSearchIndex(currentBusinesses, currentContent)) : vocabulary;
  const suggestions = new Map<string, SearchRecoverySuggestion>();
  const safeLimit = Math.max(1, Math.min(limit, 6));

  const correctedTokens = [...tokens];
  let corrected = false;
  for (let index = 0; index < correctedTokens.length; index += 1) {
    const candidate = spellingCandidate(correctedTokens[index], activeVocabulary);
    if (!candidate) continue;
    correctedTokens[index] = candidate.normalized;
    corrected = true;
  }

  if (corrected) {
    const correctedQuery = correctedTokens.map((token) => displayToken(token, activeVocabulary)).join(' ');
    const correctedResults = searchSite(correctedQuery, Number.MAX_SAFE_INTEGER, kinds, currentBusinesses, currentContent);
    if (correctedResults.length) {
      suggestions.set(normalizeArabic(correctedQuery), {
        query: correctedQuery,
        reason: 'تصحيح إملائي محتمل',
        count: correctedResults.length,
      });
    }
  }

  if (tokens.length > 1) {
    const optionalDescriptors = new Set(['مركز', 'مراكز', 'سنتر']);
    for (let droppedIndex = 0; droppedIndex < tokens.length; droppedIndex += 1) {
      // Never drop a name, service, trade, or locality just to produce results.
      if (!optionalDescriptors.has(tokens[droppedIndex])) continue;
      const relaxedTokens = tokens.filter((_, index) => index !== droppedIndex);
      if (!relaxedTokens.length) continue;
      const relaxedQuery = relaxedTokens.map((token) => displayToken(token, activeVocabulary)).join(' ');
      const relaxedResults = searchSite(relaxedQuery, Number.MAX_SAFE_INTEGER, kinds, currentBusinesses, currentContent);
      if (!relaxedResults.length) continue;
      const key = normalizeArabic(relaxedQuery);
      if (!suggestions.has(key)) {
        suggestions.set(key, {
          query: relaxedQuery,
          reason: 'بحث أوسع',
          count: relaxedResults.length,
        });
      }
    }
  }

  return [...suggestions.values()]
    .sort((a, b) => {
      if (a.reason !== b.reason) return a.reason === 'تصحيح إملائي محتمل' ? -1 : 1;
      return a.count - b.count || a.query.localeCompare(b.query, 'ar');
    })
    .slice(0, safeLimit);
}
