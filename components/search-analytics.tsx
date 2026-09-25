'use client';

import { useEffect } from 'react';
import { privacySafeSearchTerm, trackEvent } from '@/lib/analytics-client';

/** Record completed unified searches, never keystrokes or suggestion requests. */
export function SearchAnalytics({ query, count, scope }: { query: string; count: number; scope: string }) {
  useEffect(() => {
    const term = privacySafeSearchTerm(query);
    if (term.length < 2) return;
    try {
      // Scope tabs can remount the page several times for one search.
      const key = 'naqada_last_unified_search';
      const previous = JSON.parse(sessionStorage.getItem(key) || 'null') as { query?: string; at?: number } | null;
      if (previous?.query === term && Date.now() - (previous.at || 0) < 10_000) return;
      sessionStorage.setItem(key, JSON.stringify({ query: term, at: Date.now() }));
    } catch { /* Private browsing may disable storage; counting remains available. */ }

    trackEvent(count ? 'Directory Search' : 'Directory Zero Results', {
      results: count,
      category: scope,
      ...(count === 0 ? { query: term } : {}),
    });
  }, [query, count, scope]);
  return null;
}
