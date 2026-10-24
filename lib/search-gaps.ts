import { prepareSearchQuery } from './search-ranking';
import { canonicalLocalityName } from './data';
import { normalizeArabic } from './site';

export type SearchGapContext = { category?: string | null; locality?: string | null };
export type MissedSearch = SearchGapContext & {
  query: string;
  count: number;
  lastSeenAt?: string;
  variants?: string[];
};

function dimension(value?: string | null) {
  const text = value?.trim().replace(/\s+/g, ' ') || '';
  return !text || text === 'all' || text === 'unspecified' ? '' : text;
}

export function searchGapKey(item: MissedSearch) {
  let query = prepareSearchQuery(item.query).normalizedQuery;
  // These describe the same service; never merge different business/person names.
  if (/^(?:مركز |مراكز )?تخاطب$/u.test(query)) query = 'تخاطب';
  return JSON.stringify([
    query,
    normalizeArabic(dimension(item.category)),
    normalizeArabic(dimension(item.locality) ? canonicalLocalityName(dimension(item.locality)) : ''),
  ]);
}

/** Preserve historical event volume and filter context; these are not unique people. */
export function groupSearchGaps<T extends MissedSearch>(items: readonly T[]) {
  const groups = new Map<string, T & { id: string; variants: string[] }>();
  for (const item of items) {
    const query = item.query.trim().replace(/\s+/g, ' ');
    if (query.length < 2 || query.includes('\uFFFD') || !Number.isFinite(item.count) || item.count <= 0) continue;
    const id = searchGapKey({ ...item, query });
    const variants = [...new Set([...(item.variants || []), query])];
    const current = groups.get(id);
    if (current) {
      current.count += item.count;
      current.variants = [...new Set([...current.variants, ...variants])];
      if ((item.lastSeenAt || '') > (current.lastSeenAt || '')) current.lastSeenAt = item.lastSeenAt;
      if (query.length < current.query.length) current.query = query;
    } else groups.set(id, { ...item, query, id, variants });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count
    || (b.lastSeenAt || '').localeCompare(a.lastSeenAt || '') || a.query.localeCompare(b.query, 'ar'));
}

export function searchGapContextLabel(item: SearchGapContext) {
  const scopeLabels: Record<string, string> = { directory: 'الخدمات والأنشطة', places: 'القرى والمعالم', knowledge: 'الموسوعة' };
  const category = dimension(item.category);
  return [dimension(item.locality), scopeLabels[category] || category].filter(Boolean).join(' · ') || 'كل المناطق والأقسام';
}
