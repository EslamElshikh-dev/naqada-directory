'use client';

import { useEffect } from 'react';
import { trackCompletedSearch } from '@/lib/search-tracking';

/** Record completed unified searches, never keystrokes or suggestion requests. */
export function SearchAnalytics({ query, count, scope }: { query: string; count: number; scope: string }) {
  useEffect(() => {
    trackCompletedSearch({ query, results: count, category: scope });
  }, [query, count, scope]);
  return null;
}
