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
}: {
  phone: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  locality: string;
  category: string;
  listingSlug: string;
}) {
  const data = { locality, category, listingSlug };
  const localityHref = `/villages/${slugify(locality)}`;
  const similarHref = `/directory?category=${encodeURIComponent(category)}&locality=${encodeURIComponent(locality)}`;
  const categoryHref = `/directory/${slugify(category)}`;

  return (
    <>
      <div className="detail-actions">
        {phone && <a className="button button--light" href={`tel:${phone}`} onClick={() => trackEvent('Listing Call', data)}><ActionIcon name="call" /><span>اتصال الآن</span></a>}
        {whatsapp && <a className="button button--whatsapp" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing WhatsApp', data)}><ActionIcon name="call" /><span>واتساب</span></a>}
        {mapsUrl && <a className="button button--outline-light" href={mapsUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing Map Opened', data)}><ActionIcon name="map" /><span>فتح الخريطة</span></a>}
      </div>
      <nav className={styles.heroDiscovery} aria-label="استكشف حول هذا النشاط">
        <Link href={localityHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'locality' })}>دليل {locality}<span aria-hidden="true">←</span></Link>
        <Link href={similarHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'nearby-similar' })}>أنشطة مشابهة في {locality}<span aria-hidden="true">←</span></Link>
        <Link href={categoryHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'category' })}>كل {category}<span aria-hidden="true">←</span></Link>
        <a href="#cross-discovery-title" onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'cross-discovery' })}>استكشاف ذكي<span aria-hidden="true">↓</span></a>
      </nav>
    </>
  );
}
