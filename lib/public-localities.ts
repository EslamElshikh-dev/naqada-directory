import { canonicalLocalityName } from './data';
import type { Business, LocalityPage } from './types';

export function localitiesWithPublicCounts(places: readonly LocalityPage[], businesses: readonly Business[]): LocalityPage[] {
  const counts = new Map<string, number>();
  for (const item of businesses) {
    const name = canonicalLocalityName(item.locality);
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return places.map((place) => ({ ...place, businessCount: counts.get(place.name) || 0 }));
}
