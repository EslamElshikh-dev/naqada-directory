'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

function SearchTrigger({ onClick, busy = false }: { onClick?: () => void; busy?: boolean }) {
  return <div className="global-search"><button type="button" className="global-search__trigger" aria-label="البحث في دليل نقادة" aria-haspopup="dialog" aria-expanded={false} aria-busy={busy} disabled={busy} onClick={onClick}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.7" cy="10.7" r="5.8" /><path d="m15.1 15.1 4 4" /></svg><span>بحث</span>
  </button></div>;
}
const LoadedSearch = dynamic(() => import('./global-search').then(module => module.GlobalSearch), {
  ssr: false, loading: () => <SearchTrigger busy />,
});
export function DeferredGlobalSearch() {
  const [loaded, setLoaded] = useState(false);
  return loaded ? <LoadedSearch initialOpen /> : <SearchTrigger onClick={() => setLoaded(true)} />;
}
