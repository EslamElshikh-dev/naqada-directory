import { activityLandings, getBusinessesForActivity, type ActivityLanding } from './activity-landings';
import { canonicalLocalityName, categories, localities } from './data';
import { buildSearchContext } from './search-context';
import { rankSearchFields } from './search-ranking';
import { normalizeArabic } from './site';

export type SearchJourneyLink = {
  title: string;
  subtitle: string;
  href: string;
  count: number;
  badge: string;
};

export type SearchJourney = {
  locality: string;
  serviceLabel: string;
  categoryLabel: string;
  scope: string | null;
  relatedServices: SearchJourneyLink[];
  sameScopePlaces: SearchJourneyLink[];
  sameServiceElsewhere: SearchJourneyLink[];
};

function activityLabel(activity: ActivityLanding) {
  return activity.name.replace(/\s+(?:في\s+)?نقادة$/, '').trim();
}

function searchHref(service: string, locality: string) {
  return `/search?q=${encodeURIComponent(`${service} ${locality}`)}&scope=directory`;
}

function exactActivityCount(activity: ActivityLanding, localityName: string) {
  return getBusinessesForActivity(activity)
    .filter((business) => canonicalLocalityName(business.locality) === localityName)
    .length;
}

function categoryCount(categoryName: string, localityName: string) {
  return getBusinessesForActivity({
    name: categoryName,
    slug: '',
    searchLabel: categoryName,
    description: '',
    visualCategory: categoryName,
    categories: [categoryName],
  }).filter((business) => canonicalLocalityName(business.locality) === localityName).length;
}

function serviceQueryFor(query: string, localityName: string) {
  let normalized = normalizeArabic(query);
  const aliases = localityName === 'مدينة نقادة'
    ? [normalizeArabic(localityName), normalizeArabic('نقادة')]
    : [normalizeArabic(localityName)];
  for (const alias of aliases) normalized = normalized.replace(alias, ' ');
  return normalized.replace(/\s+/g, ' ').trim();
}

function bestActivityFor(query: string, localityName: string) {
  const serviceQuery = serviceQueryFor(query, localityName);
  if (serviceQuery.length < 2) return null;

  const ranked = activityLandings
    .map((activity) => ({
      activity,
      score: rankSearchFields({
        title: activity.searchLabel,
        category: activity.visualCategory,
        subcategory: (activity.subcategories || []).join(' '),
        auxiliary: [activity.name, ...(activity.categories || [])].join(' '),
      }, serviceQuery),
    }))
    .filter(({ score }) => score >= 18)
    .sort((a, b) => b.score - a.score || a.activity.name.localeCompare(b.activity.name, 'ar'));

  return ranked[0]?.activity || null;
}

export function buildSearchJourney(query: string): SearchJourney | null {
  const context = buildSearchContext(query);
  if (!context) return null;

  const currentActivity = bestActivityFor(query, context.locality);
  if (!currentActivity) return null;

  const currentLocality = localities.find((item) => item.name === context.locality);
  const category = categories.find((item) => item.name === currentActivity.visualCategory);
  if (!currentLocality || !category) return null;

  const relatedServices = activityLandings
    .filter((activity) => activity.slug !== currentActivity.slug && activity.visualCategory === currentActivity.visualCategory)
    .map((activity) => ({ activity, count: exactActivityCount(activity, currentLocality.name) }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || a.activity.name.localeCompare(b.activity.name, 'ar'))
    .slice(0, 4)
    .map(({ activity, count }) => ({
      title: activityLabel(activity),
      subtitle: `${count.toLocaleString('ar-EG')} نتيجة داخل ${currentLocality.name}`,
      href: searchHref(activity.searchLabel, currentLocality.name),
      count,
      badge: 'خدمة مرتبطة',
    }));

  const sameScopePlaces = currentLocality.scope
    ? localities
        .filter((locality) => locality.name !== currentLocality.name && locality.scope === currentLocality.scope && locality.businessCount > 0)
        .map((locality) => ({
          locality,
          exactCount: exactActivityCount(currentActivity, locality.name),
          broadCount: categoryCount(currentActivity.visualCategory, locality.name),
        }))
        .filter(({ broadCount }) => broadCount > 0)
        .sort((a, b) => b.exactCount - a.exactCount || b.broadCount - a.broadCount || b.locality.businessCount - a.locality.businessCount)
        .slice(0, 4)
        .map(({ locality, exactCount, broadCount }) => ({
          title: locality.name,
          subtitle: exactCount > 0
            ? `${exactCount.toLocaleString('ar-EG')} من نفس الخدمة · ${broadCount.toLocaleString('ar-EG')} ضمن ${category.shortLabel}`
            : `${broadCount.toLocaleString('ar-EG')} نتيجة ضمن ${category.shortLabel}`,
          href: exactCount > 0 ? searchHref(currentActivity.searchLabel, locality.name) : `/villages/${locality.slug}`,
          count: exactCount || broadCount,
          badge: 'نفس النطاق الإداري',
        }))
    : [];

  const sameScopeNames = new Set(sameScopePlaces.map((item) => item.title));
  const sameServiceElsewhere = localities
    .filter((locality) => locality.name !== currentLocality.name && !sameScopeNames.has(locality.name) && locality.businessCount > 0)
    .map((locality) => ({ locality, count: exactActivityCount(currentActivity, locality.name) }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || b.locality.businessCount - a.locality.businessCount || a.locality.name.localeCompare(b.locality.name, 'ar'))
    .slice(0, 6)
    .map(({ locality, count }) => ({
      title: locality.name,
      subtitle: `${count.toLocaleString('ar-EG')} نتيجة من نفس الخدمة`,
      href: searchHref(currentActivity.searchLabel, locality.name),
      count,
      badge: 'نفس الخدمة',
    }));

  if (!relatedServices.length && !sameScopePlaces.length && !sameServiceElsewhere.length) return null;

  return {
    locality: currentLocality.name,
    serviceLabel: activityLabel(currentActivity),
    categoryLabel: category.shortLabel,
    scope: currentLocality.scope,
    relatedServices,
    sameScopePlaces,
    sameServiceElsewhere,
  };
}
