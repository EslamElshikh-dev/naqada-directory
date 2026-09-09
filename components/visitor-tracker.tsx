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

    const schedule = 'requestIdleCallback' in window
      ? { kind: 'idle' as const, id: window.requestIdleCallback(sendVisit, { timeout: 2500 }) }
      : { kind: 'timer' as const, id: window.setTimeout(sendVisit, 1800) };

    window.addEventListener('pagehide', sendVisit, { once: true });

    return () => {
      window.removeEventListener('pagehide', sendVisit);
      if (schedule.kind === 'idle') window.cancelIdleCallback(schedule.id);
      else window.clearTimeout(schedule.id);
    };
  }, [pathname]);

  return null;
}
