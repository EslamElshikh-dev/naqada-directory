import { businesses, canonicalLocalityName, categories, officialLocalities } from '@/lib/data';

export type MissedSearch = { query: string; count: number };

export type GrowthPriority = {
  id: string;
  source: 'search' | 'coverage';
  title: string;
  query: string | null;
  demandCount: number;
  locality: string | null;
  localitySlug: string | null;
  category: string | null;
  categoryLabel: string | null;
  localityCount: number;
  localCategoryCount: number | null;
  score: number;
  priority: 'عاجل' | 'مرتفع' | 'متوسط';
  signals: string[];
  actionHref: string;
  localityHref: string | null;
};

const primaryCategoryNames = [
  'الطب والصحة',
  'التجزئة والتسوق',
  'التعليم',
  'المطاعم والأطعمة',
  'البناء والصيانة',
  'السيارات والنقل',
  'الإلكترونيات والهواتف',
  'الخدمات المهنية',
];

const categoryAliases: Record<string, string[]> = {
  'الطب والصحة': ['اسنان', 'طبيب', 'دكتور', 'صيدليه', 'صيدلية', 'معمل', 'تحاليل', 'اشعه', 'اشعة', 'مستشفى', 'عياده', 'عيادة'],
  'التجزئة والتسوق': ['سوبر ماركت', 'سوبرماركت', 'بقاله', 'بقالة', 'ملابس', 'احذيه', 'أحذية', 'مفروشات', 'متجر', 'محل'],
  'التعليم': ['حضانه', 'حضانة', 'سنتر', 'مدرسه', 'مدرسة', 'دروس', 'تعليم'],
  'المطاعم والأطعمة': ['مطعم', 'كافيه', 'مقهى', 'مخبز', 'فرن', 'حلواني', 'اكل', 'أكل'],
  'البناء والصيانة': ['مقاول', 'سباك', 'كهربائي', 'نجار', 'حداد', 'صيانه', 'صيانة', 'تشطيبات', 'ترميم'],
  'السيارات والنقل': ['مواصلات', 'تاكسي', 'ميكانيكي', 'كهربائي سيارات', 'قطع غيار', 'سيارات', 'موتوسيكلات'],
  'الإلكترونيات والهواتف': ['موبايل', 'موبايلات', 'تليفون', 'هواتف', 'كمبيوتر', 'الكترونيات', 'إلكترونيات'],
  'الخدمات المهنية': ['محامي', 'محاسب', 'هندسي', 'مهندس', 'ترجمه', 'ترجمة'],
  'الخدمات المالية': ['بنك', 'فوري', 'تمويل', 'صراف', 'صرف'],
  'دور العبادة': ['مسجد', 'جامع', 'كنيسه', 'كنيسة'],
  'التجميل والعناية': ['حلاق', 'كوافير', 'صالون', 'تجميل'],
  'الجمعيات والمجتمع': ['جمعيه', 'جمعية', 'مؤسسه خيريه', 'مؤسسة خيرية'],
};

const essentialCategoryWeight: Record<string, number> = {
  'الطب والصحة': 10,
  'التعليم': 9,
  'التجزئة والتسوق': 8,
  'المطاعم والأطعمة': 7,
  'البناء والصيانة': 6,
  'السيارات والنقل': 5,
  'الإلكترونيات والهواتف': 5,
  'الخدمات المهنية': 4,
};

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function localityAliases(name: string) {
  const normalized = normalizeArabic(name);
  const stripped = normalized.replace(/^(نجع|عزبه|قريه|ساحل)\s+/, '').trim();
  return [...new Set([normalized, stripped].filter((item) => item.length >= 3))];
}

const localityStats = officialLocalities.map((locality) => {
  const count = businesses.filter((item) => canonicalLocalityName(item.locality) === locality.name).length;
  return { ...locality, count, aliases: localityAliases(locality.name) };
});

const localCategoryCounts = new Map<string, number>();
for (const business of businesses) {
  const locality = canonicalLocalityName(business.locality);
  const key = `${locality}::${business.category}`;
  localCategoryCounts.set(key, (localCategoryCounts.get(key) || 0) + 1);
}

function localCategoryCount(locality: string, category: string) {
  return localCategoryCounts.get(`${locality}::${category}`) || 0;
}

function inferLocality(query: string) {
  const normalized = normalizeArabic(query);
  return localityStats
    .flatMap((locality) => locality.aliases.map((alias) => ({ locality, alias })))
    .filter(({ alias }) => normalized.includes(alias))
    .sort((a, b) => b.alias.length - a.alias.length)[0]?.locality || null;
}

function inferCategory(query: string) {
  const normalized = normalizeArabic(query);
  const direct = categories
    .flatMap((category) => [category.name, category.shortLabel].map((label) => ({ category, label: normalizeArabic(label) })))
    .filter(({ label }) => label.length >= 3 && normalized.includes(label))
    .sort((a, b) => b.label.length - a.label.length)[0]?.category;
  if (direct) return direct;

  const aliasMatch = Object.entries(categoryAliases)
    .flatMap(([categoryName, aliases]) => aliases.map((alias) => ({ categoryName, alias: normalizeArabic(alias) })))
    .filter(({ alias }) => normalized.includes(alias))
    .sort((a, b) => b.alias.length - a.alias.length)[0];
  return aliasMatch ? categories.find((category) => category.name === aliasMatch.categoryName) || null : null;
}

function localityWeakness(count: number) {
  if (count === 0) return 18;
  if (count <= 2) return 15;
  if (count <= 5) return 11;
  if (count <= 10) return 7;
  if (count <= 15) return 4;
  return 0;
}

function band(score: number): GrowthPriority['priority'] {
  if (score >= 80) return 'عاجل';
  if (score >= 60) return 'مرتفع';
  return 'متوسط';
}

function contributionHref(name: string, category?: string | null, locality?: string | null) {
  const params = new URLSearchParams({ type: 'missing', name });
  if (category) params.set('category', category);
  if (locality) params.set('locality', locality);
  return `/contribute?${params.toString()}`;
}

function buildSearchPriority(item: MissedSearch): GrowthPriority {
  const query = item.query.trim();
  const locality = inferLocality(query);
  const category = inferCategory(query);
  const localityCount = locality?.count || 0;
  const pairCount = locality && category ? localCategoryCount(locality.name, category.name) : null;
  // A real zero-result search must always outrank a coverage-only suggestion.
  // One observed search starts at 55; proactive coverage is hard-capped at 49 below.
  const demand = 50 + Math.min(20, Math.max(1, item.count) * 5);
  const pairGap = pairCount === null ? 0 : pairCount === 0 ? 22 : pairCount === 1 ? 14 : pairCount === 2 ? 8 : 0;
  const specificity = locality && category ? 8 : locality || category ? 4 : 0;
  const score = Math.min(100, demand + pairGap + (locality ? localityWeakness(localityCount) : 0) + specificity);
  const signals = [`${item.count.toLocaleString('ar-EG')} بحث دون نتيجة`];
  if (locality) signals.push(`${localityCount.toLocaleString('ar-EG')} سجلًا منشورًا في ${locality.name}`);
  if (category && pairCount !== null) signals.push(`${pairCount.toLocaleString('ar-EG')} من فئة ${category.shortLabel} داخل الموضع`);
  if (!locality && !category) signals.push('نية بحث حقيقية تحتاج تصنيفًا يدويًا قبل الجمع');

  return {
    id: `search:${normalizeArabic(query)}`,
    source: 'search',
    title: query,
    query,
    demandCount: item.count,
    locality: locality?.name || null,
    localitySlug: locality?.slug || null,
    category: category?.name || null,
    categoryLabel: category?.shortLabel || null,
    localityCount,
    localCategoryCount: pairCount,
    score,
    priority: band(score),
    signals,
    actionHref: contributionHref(query, category?.name, locality?.name),
    localityHref: locality ? `/villages/${locality.slug}` : null,
  };
}

function buildCoveragePriorities(): GrowthPriority[] {
  return localityStats
    .filter((locality) => locality.count < 15)
    .flatMap((locality): GrowthPriority[] => primaryCategoryNames.flatMap((categoryName): GrowthPriority[] => {
      const category = categories.find((item) => item.name === categoryName);
      if (!category) return [];
      const pairCount = localCategoryCount(locality.name, category.name);
      if (pairCount >= 3) return [];
      const score = Math.min(
        49,
        20
          + (essentialCategoryWeight[category.name] || 3)
          + localityWeakness(locality.count)
          + (pairCount === 0 ? 12 : pairCount === 1 ? 7 : 3),
      );

      return [{
        id: `coverage:${locality.slug}:${category.slug}`,
        source: 'coverage',
        title: `${category.shortLabel} في ${locality.name}`,
        query: null,
        demandCount: 0,
        locality: locality.name,
        localitySlug: locality.slug,
        category: category.name,
        categoryLabel: category.shortLabel,
        localityCount: locality.count,
        localCategoryCount: pairCount,
        score,
        priority: band(score),
        signals: [
          `${locality.count.toLocaleString('ar-EG')} سجلًا فقط في الموضع`,
          `${pairCount.toLocaleString('ar-EG')} من فئة ${category.shortLabel}`,
          'فرصة تغطية استباقية بلا طلب بحث مسجل',
        ],
        actionHref: contributionHref(`${category.shortLabel} في ${locality.name}`, category.name, locality.name),
        localityHref: `/villages/${locality.slug}`,
      }];
    }));
}

export function buildGrowthPriorities(missedSearches: MissedSearch[], limit = 18) {
  const searchItems = missedSearches
    .filter((item) => item.query.trim() && item.count > 0)
    .map(buildSearchPriority);

  const searchPairs = new Set(searchItems
    .filter((item) => item.locality && item.category)
    .map((item) => `${item.locality}::${item.category}`));

  const coverageItems = buildCoveragePriorities().filter((item) => !searchPairs.has(`${item.locality}::${item.category}`));
  const items = [...searchItems, ...coverageItems]
    .sort((a, b) => b.score - a.score || b.demandCount - a.demandCount || a.title.localeCompare(b.title, 'ar'))
    .slice(0, limit);

  return {
    items,
    summary: {
      missedSearchTerms: searchItems.length,
      missedSearchVolume: searchItems.reduce((sum, item) => sum + item.demandCount, 0),
      demandBacked: items.filter((item) => item.source === 'search').length,
      coverageOnly: items.filter((item) => item.source === 'coverage').length,
      weakLocalities: localityStats.filter((item) => item.count < 3).length,
    },
  };
}
