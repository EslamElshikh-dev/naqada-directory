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

    let sent = false;
    const sendVisit = () => {
      if (sent) return;
      sent = true;
      void fetch('/api/analytics/visit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({ path: pathname, referrerHost: externalReferrerHost() }),
      }).catch(() => null);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleId = typeof idleWindow.requestIdleCallback === 'function'
      ? idleWindow.requestIdleCallback(sendVisit, { timeout: 2500 })
      : null;
    const timerId = idleId === null ? window.setTimeout(sendVisit, 1800) : null;

    window.addEventListener('pagehide', sendVisit, { once: true });

    return () => {
      window.removeEventListener('pagehide', sendVisit);
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [pathname]);

  return null;
}
