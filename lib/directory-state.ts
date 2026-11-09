import type { Metadata } from 'next';
import type { Category, DirectoryItem, LocalityPage } from './types';
import { hasBusinessMedia } from './business-media';
import { isFamilySearchQuery } from './family-search';
import { jobSearchIntent } from './job-search';
import { normalizeSearchFields, prepareSearchQuery, scoreNormalizedSearchFields } from './search-ranking';
import { absoluteUrl, canonicalPath } from './site';

export const DIRECTORY_PAGE_SIZE = 12;
export type DirectorySort = 'recommended' | 'rating' | 'name';
export type DirectorySearchParams = { q?: string | string[]; category?: string | string[]; locality?: string | string[]; sort?: string | string[]; page?: string | string[] };
export type DirectoryState = { q: string; category: string; locality: string; sort: DirectorySort; page: number; totalPages: number; hasFilters: boolean };
type Selection = Pick<DirectoryState, 'q' | 'category' | 'locality' | 'sort'>;

function firstValue(value?: string | string[]) { return Array.isArray(value) ? value[0] || '' : value || ''; }

export function filterDirectoryMatches<T extends DirectoryItem>(matches: Array<{ item: T; rank: number }>, state: Selection): T[] {
  const filtered = matches.filter(({ item }) => (!state.category || item.category === state.category)
    && (!state.locality || (item.locality || 'مركز نقادة') === state.locality));
  filtered.sort((a, b) => {
    if (state.sort === 'name') return a.item.name.localeCompare(b.item.name, 'ar');
    if (state.sort === 'rating') return (b.item.rating || 0) - (a.item.rating || 0) || (b.item.reviews || 0) - (a.item.reviews || 0);
    if (state.q.trim() && b.rank !== a.rank) return b.rank - a.rank;
    const mediaPriority = Number(Boolean(b.item.imageUrl) || hasBusinessMedia(b.item.id)) - Number(Boolean(a.item.imageUrl) || hasBusinessMedia(a.item.id));
    return mediaPriority || (b.item.reviews || 0) - (a.item.reviews || 0) || (b.item.rating || 0) - (a.item.rating || 0) || a.item.name.localeCompare(b.item.name, 'ar');
  });
  return filtered.map(({ item }) => item);
}

export function directoryResults<T extends DirectoryItem>(items: T[], state: Selection, localityNames: string[]): T[] {
  if (isFamilySearchQuery(state.q) || jobSearchIntent(state.q)) return [];
  const intent = prepareSearchQuery(state.q, localityNames);
  const matches = items.map(item => ({ item, rank: intent.tokens.length ? scoreNormalizedSearchFields(normalizeSearchFields({
    title: item.name, category: item.category, subcategory: item.subcategory, locality: item.locality, address: item.address,
    auxiliary: [item.normalizedName, item.parentLocality].filter(Boolean).join(' '),
  }), intent.normalizedQuery, intent.tokens, intent) : 0 })).filter(({ rank }) => rank >= 0);
  return filterDirectoryMatches(matches, state);
}

export function resolveDirectoryState(params: DirectorySearchParams, items: DirectoryItem[], scope: {
  categories: Category[]; localities: LocalityPage[]; lockedCategory?: string; lockedLocality?: string;
}): DirectoryState {
  const requestedCategory = firstValue(params.category);
  const requestedLocality = firstValue(params.locality);
  const requestedSort = firstValue(params.sort);
  const selection: Selection = {
    q: firstValue(params.q).trim().slice(0, 100),
    category: scope.lockedCategory || (scope.categories.some(item => item.name === requestedCategory) ? requestedCategory : ''),
    locality: scope.lockedLocality || (scope.localities.some(item => item.name === requestedLocality) ? requestedLocality : ''),
    sort: requestedSort === 'name' || requestedSort === 'rating' ? requestedSort : 'recommended',
  };
  const totalPages = Math.max(1, Math.ceil(directoryResults(items, selection, scope.localities.map(item => item.name)).length / DIRECTORY_PAGE_SIZE));
  const rawPage = firstValue(params.page);
  const requestedPage = /^[1-9]\d*$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(requestedPage) ? Math.min(requestedPage, totalPages) : 1;
  const hasFilters = Boolean(selection.q || (!scope.lockedCategory && selection.category) || (!scope.lockedLocality && selection.locality) || selection.sort !== 'recommended');
  return { ...selection, page, totalPages, hasFilters };
}

export function directoryPageHref(basePath: string, page: number) {
  return canonicalPath(basePath) + (page > 1 ? `?page=${page}` : '');
}

export function directoryPageMetadata(metadata: Metadata, basePath: string, state: DirectoryState): Metadata {
  const canonical = directoryPageHref(basePath, state.hasFilters ? 1 : state.page);
  return {
    ...metadata,
    alternates: { ...metadata.alternates, canonical },
    ...(state.hasFilters ? { robots: { index: false, follow: true } } : {}),
    openGraph: { ...metadata.openGraph, url: absoluteUrl(basePath) + (state.hasFilters || state.page === 1 ? '' : `?page=${state.page}`) },
    pagination: state.hasFilters ? undefined : {
      previous: state.page > 1 ? directoryPageHref(basePath, state.page - 1) : null,
      next: state.page < state.totalPages ? directoryPageHref(basePath, state.page + 1) : null,
    },
  };
}

export function directoryQuerySuffix(params: DirectorySearchParams) {
  const query = new URLSearchParams();
  for (const key of ['q', 'category', 'locality', 'sort', 'page'] as const) {
    const value = firstValue(params[key]);
    if (value) query.set(key, value.slice(0, 100));
  }
  return query.size ? `?${query}` : '';
}
