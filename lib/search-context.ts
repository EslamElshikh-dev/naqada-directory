import { activityLandings, getBusinessesForActivity } from './activity-landings';
import { canonicalLocalityName, categories, localities } from './data';
import { MIN_LOCAL_CATEGORY_RESULTS, localCategoryHref, localCategoryResultCount } from './discovery-routing';
import { rankSearchFields } from './search-ranking';
import { normalizeArabic } from './site';
import type { SiteSearchResult } from './site-search';

export type SearchContextResult = SiteSearchResult & {
  count: number;
  locality: string;
  category: string;
};

type LocalityCandidate = {
  name: string;
  normalized: string;
};

const localityCandidates: LocalityCandidate[] = localities
  .flatMap((item) => {
    const candidates = [{ name: item.name, normalized: normalizeArabic(item.name) }];
    if (item.name === 'مدينة نقادة') candidates.push({ name: item.name, normalized: normalizeArabic('نقادة') });
    return candidates;
  })
  .filter((item) => item.normalized.length >= 3)
  .sort((a, b) => b.normalized.length - a.normalized.length);

function phraseIncluded(haystack: string, needle: string) {
  return ` ${haystack} `.includes(` ${needle} `) || haystack.startsWith(`${needle} `) || haystack.endsWith(` ${needle}`);
}

function activityLabel(name: string) {
  return name.replace(/\s+(?:في\s+)?نقادة$/, '').trim();
}

export function buildSearchContext(value: string): SearchContextResult | null {
  const query = value.trim();
  if (query.length < 2) return null;

  const normalizedQuery = normalizeArabic(query);
  const matchedLocality = localityCandidates.find((candidate) => phraseIncluded(normalizedQuery, candidate.normalized));
  if (!matchedLocality) return null;

  const serviceQuery = normalizedQuery
    .replace(matchedLocality.normalized, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (serviceQuery.length < 2) return null;

  const rankedActivities = activityLandings
    .map((activity) => ({
      activity,
      score: rankSearchFields({
        title: activity.searchLabel,
        category: activity.visualCategory,
        subcategory: (activity.subcategories || []).join(' '),
        auxiliary: [activity.name, ...(activity.categories || [])].join(' '),
      }, serviceQuery),
    }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.activity.name.localeCompare(b.activity.name, 'ar'));

  const best = rankedActivities[0];
  if (!best || best.score < 18) return null;

  const activityBusinesses = getBusinessesForActivity(best.activity)
    .filter((business) => canonicalLocalityName(business.locality) === matchedLocality.name);
  if (!activityBusinesses.length) return null;

  const localCategoryCount = localCategoryResultCount(best.activity.visualCategory, matchedLocality.name);
  if (localCategoryCount < MIN_LOCAL_CATEGORY_RESULTS) return null;

  const category = categories.find((item) => item.name === best.activity.visualCategory);
  if (!category) return null;

  const count = activityBusinesses.length;
  return {
    kind: 'category',
    title: `${activityLabel(best.activity.name)} في ${matchedLocality.name}`,
    subtitle: `${count.toLocaleString('ar-EG')} نتيجة مطابقة · افتح صفحة ${category.shortLabel} المحلية`,
    href: localCategoryHref(category.name, matchedLocality.name),
    badge: 'مسار محلي',
    count,
    locality: matchedLocality.name,
    category: category.name,
  };
}
