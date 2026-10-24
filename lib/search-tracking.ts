import { privacySafeSearchTerm, trackEvent } from './analytics-client';

type CompletedSearch = {
  query: string;
  results: number;
  category?: string;
  locality?: string;
};

const recentSearches = new Map<string, number>();
const storageKey = 'naqada_completed_searches_v2';
const dedupeWindow = 10_000;

/** Call only on submission, result selection, or opening a submitted search URL. */
export function trackCompletedSearch({ query, results, category, locality }: CompletedSearch) {
  if (typeof window === 'undefined') return false;
  const term = privacySafeSearchTerm(query);
  // Don't count private input, category page loads, or one-letter fragments as searches.
  if (term.length < 2 || !Number.isFinite(results) || results < 0) return false;
  const key = JSON.stringify([term, category || 'all', locality || 'all', results > 0]);
  const now = Date.now();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(storageKey) || '[]') as unknown;
    if (Array.isArray(stored)) {
      for (const entry of stored) {
        if (Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'number' && now - entry[1] < dedupeWindow) {
          recentSearches.set(entry[0], entry[1]);
        }
      }
    }
  } catch { /* In-memory deduplication also works when browser storage is unavailable. */ }
  for (const [fingerprint, at] of recentSearches) {
    if (now - at >= dedupeWindow) recentSearches.delete(fingerprint);
  }
  if (recentSearches.has(key)) return false;
  recentSearches.set(key, now);
  // Keep memory and session storage bounded, including in a long-running tab.
  if (recentSearches.size > 50) recentSearches.delete(recentSearches.keys().next().value!);
  try { window.sessionStorage.setItem(storageKey, JSON.stringify([...recentSearches])); } catch { /* Optional storage. */ }
  trackEvent(results > 0 ? 'Directory Search' : 'Directory Zero Results', {
    results,
    category: category || 'all',
    locality: locality || 'all',
    ...(results === 0 ? { query: term } : {}),
  });
  return true;
}
