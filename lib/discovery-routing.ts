import { businesses, canonicalLocalityName, categories, localities } from './data';

export const MIN_LOCAL_CATEGORY_RESULTS = 3;

const localCategoryCounts = new Map<string, number>();

for (const business of businesses) {
  const locality = canonicalLocalityName(business.locality);
  const key = `${locality}::${business.category}`;
  localCategoryCounts.set(key, (localCategoryCounts.get(key) || 0) + 1);
}

export function localCategoryResultCount(categoryName: string, localityName: string) {
  const locality = canonicalLocalityName(localityName);
  return localCategoryCounts.get(`${locality}::${categoryName}`) || 0;
}

export function localCategoryHref(categoryName: string, localityName: string) {
  const localityNameCanonical = canonicalLocalityName(localityName);
  const locality = localities.find((item) => item.name === localityNameCanonical);
  const category = categories.find((item) => item.name === categoryName);
  const count = localCategoryResultCount(categoryName, localityNameCanonical);

  if (locality && category && count >= MIN_LOCAL_CATEGORY_RESULTS) {
    return `/villages/${locality.slug}/${category.slug}`;
  }

  return `/directory?category=${encodeURIComponent(categoryName)}&locality=${encodeURIComponent(localityNameCanonical)}`;
}
