import { prepareSearchQuery, rankSearchFields, type SearchRankingFields } from './search-ranking';
import type { Family } from './types';

export type FamilySearchPage = {
  kind: 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
  fields: SearchRankingFields;
};

export function isFamilySearchQuery(query: string) {
  return prepareSearchQuery(query).tokens.some((token) => /^(?:ال)?(?:عائلات|عايلات|عائله|عايله|اسر)$/u.test(token));
}

export function buildFamilySearchPages(records: Family[]): FamilySearchPage[] {
  const byLocality = new Map<string, Family[]>();
  for (const record of records) {
    if (!['ready', 'ready_with_caution'].includes(record.status) || !['A', 'A-', 'B+', 'B'].includes(record.grade)) continue;
    const group = byLocality.get(record.locality) || [];
    group.push(record);
    byLocality.set(record.locality, group);
  }
  const localityPages: FamilySearchPage[] = [...byLocality].map(([locality, group]) => ({
    kind: 'page',
    title: `عائلات ${locality}`,
    subtitle: `${group.length.toLocaleString('ar-EG')} سجلًا موثقًا · قائمة جزئية بالمصادر وحدود الدليل`,
    href: `/families?${new URLSearchParams({ locality })}`,
    badge: 'سجل العائلات',
    fields: {
      title: `عائلات ${locality}`, locality,
      auxiliary: group.flatMap((item) => [item.name, item.alias]).filter(Boolean).join(' '),
    },
  }));
  if (!localityPages.length) return [];
  const count = [...byLocality.values()].reduce((sum, group) => sum + group.length, 0);
  return [{
    kind: 'page', title: 'عائلات نقادة',
    subtitle: `${count.toLocaleString('ar-EG')} سجلًا منشورًا مع الموضع والدليل · سجل جزئي`,
    href: '/families', badge: 'سجل العائلات',
    fields: { title: 'عائلات نقادة', auxiliary: 'عايلات نقاده عائلات نقادة عايلات نجوع قرى اسر' },
  }, ...localityPages];
}

export function searchFamilyPages(query: string, pages: FamilySearchPage[]) {
  if (!isFamilySearchQuery(query)) return [];
  return pages
    .map((item) => ({ item, rank: rankSearchFields(item.fields, query) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => b.rank - a.rank || a.item.title.localeCompare(b.item.title, 'ar'))
    .map(({ item }) => item);
}
