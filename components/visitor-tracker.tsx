'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function externalReferrerHost() {
  if (!document.referrer) return '';
  try {
    const referrer = new URL(document.referrer);
    return referrer.hostname === window.location.hostname ? '' : referrer.hostname.slice(0, 160);
  } catch {
    return '';
  }
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const timer = window.setTimeout(() => {
      void fetch('/api/analytics/visit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({ path: pathname, referrerHost: externalReferrerHost() }),
      }).catch(() => null);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
