'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/analytics-client';
import { slugify } from '@/lib/site';
import { ActionIcon } from './action-icon';
import styles from './listing-discovery.module.css';

export function ListingPrimaryActions({
  phone,
  whatsapp,
  mapsUrl,
  locality,
  category,
  listingSlug,
  surface = 'hero',
  mapLabel = 'الاتجاهات',
  showDiscovery = true,
}: {
  phone: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  locality: string;
  category: string;
  listingSlug: string;
  surface?: 'hero' | 'light';
  mapLabel?: string;
  showDiscovery?: boolean;
}) {
  const data = { locality, category, listingSlug };
  const localityHref = `/villages/${slugify(locality)}`;
  const similarHref = `/directory?category=${encodeURIComponent(category)}&locality=${encodeURIComponent(locality)}`;
  const categoryHref = `/directory/${slugify(category)}`;

  return (
    <>
      <div className={`${styles.primaryActions} ${surface === 'light' ? styles.onLight : ''}`} aria-label="التواصل مع النشاط والوصول إليه">
        {phone && <a className={`${styles.primaryAction} ${styles.callAction}`} href={`tel:${phone}`} onClick={() => trackEvent('Listing Call', data)}><ActionIcon name="call" /><span><strong>اتصال الآن</strong><small dir="ltr">{phone}</small></span></a>}
        {whatsapp && <a className={`${styles.primaryAction} ${styles.whatsappAction}`} href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing WhatsApp', data)}><ActionIcon name="message" /><span><strong>واتساب</strong><small>راسل النشاط</small></span></a>}
        {mapsUrl && <a className={`${styles.primaryAction} ${styles.mapAction}`} href={mapsUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing Map Opened', data)}><ActionIcon name="map" /><span><strong>{mapLabel}</strong><small>خرائط Google</small></span></a>}
      </div>
      {showDiscovery && <nav className={styles.heroDiscovery} aria-label="استكشف حول هذا النشاط">
        <Link href={localityHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'locality' })}>دليل {locality}<span aria-hidden="true">←</span></Link>
        <Link href={similarHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'nearby-similar' })}>أنشطة مشابهة في {locality}<span aria-hidden="true">←</span></Link>
        <Link href={categoryHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'category' })}>كل {category}<span aria-hidden="true">←</span></Link>
        <a href="#cross-discovery-title" onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'cross-discovery' })}>استكشاف ذكي<span aria-hidden="true">↓</span></a>
      </nav>}
    </>
  );
}
