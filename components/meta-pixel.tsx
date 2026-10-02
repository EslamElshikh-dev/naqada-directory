'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type PixelWindow = Window & {
  fbq?: (command: 'track', event: 'PageView') => void;
};

const bootstrap = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState = true;
fbq('set', 'autoConfig', false, '28666614406293709');
fbq('init', '28666614406293709');
`;

export function MetaPixel() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const lastPage = useRef<string | null>(null);

  const trackPageView = useCallback(() => {
    const pixel = (window as PixelWindow).fbq;
    if (!pixel || !pathname) return;
    const page = `${pathname}${search ? `?${search}` : ''}`;
    if (lastPage.current === page) return;
    lastPage.current = page;
    pixel('track', 'PageView');
  }, [pathname, search]);

  // One owner for PageView: covers initial load, client navigation and back/forward.
  // The bootstrap disables Meta's History API listener to avoid duplicate events.
  useEffect(trackPageView, [trackPageView]);

  return (
    <Script id="meta-pixel" strategy="afterInteractive" onReady={trackPageView}>
      {bootstrap}
    </Script>
  );
}
