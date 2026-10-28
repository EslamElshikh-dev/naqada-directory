'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { formatNumber } from '@/lib/format-number';

// A live footer counter must not turn immutable encyclopedia pages into DB reads.
export function FooterBusinessCount() {
  const target = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const pathname = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetch('/api/public-counts/', { cache: 'no-store', signal: controller.signal })
        .then(response => response.ok ? response.json() : Promise.reject())
        .then(data => { if (Number.isSafeInteger(data.businesses) && data.businesses >= 0) setCount(data.businesses); })
        .catch(() => {});
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    }, { rootMargin: '300px' });
    if (target.current) observer.observe(target.current);
    return () => { controller.abort(); observer.disconnect(); };
  }, [pathname]);
  return <span ref={target}>{count === null ? '…' : formatNumber(count)}</span>;
}
