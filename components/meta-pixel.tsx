'use client';

import Script from 'next/script';
import integrity from '@/data/script-integrity.json';
import { useMarketingConsent } from '@/lib/marketing-consent';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type PixelWindow = Window & {
  fbq?: (command: 'track' | 'consent', event: 'PageView' | 'grant' | 'revoke') => void;
};


export function MetaPixel() {
  const consent = useMarketingConsent();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (consent !== 'granted') return;
    const timer = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(timer);
  }, [consent]);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const lastPage = useRef<string | null>(null);

  const trackPageView = useCallback(() => {
    const pixel = (window as PixelWindow).fbq;
    if (!pixel || !pathname || consent !== 'granted' || !ready) return;
    pixel('consent', 'grant');
    const page = `${pathname}${search ? `?${search}` : ''}`;
    if (lastPage.current === page) return;
    lastPage.current = page;
    pixel('track', 'PageView');
  }, [pathname, search, consent, ready]);

  // One owner for PageView: covers initial load, client navigation and back/forward.
  // The bootstrap disables Meta's History API listener to avoid duplicate events.
  useEffect(() => {
    if (consent !== 'granted') { (window as PixelWindow).fbq?.('consent', 'revoke'); lastPage.current = null; return; }
    trackPageView();
  }, [consent, trackPageView]);

  if (consent !== 'granted' || !ready) return null;
  return (
    <Script id="meta-pixel" src="/scripts/meta-pixel-bootstrap.js" integrity={integrity['/scripts/meta-pixel-bootstrap.js']} crossOrigin="anonymous" strategy="lazyOnload" onReady={() => queueMicrotask(trackPageView)} />
  );
}
