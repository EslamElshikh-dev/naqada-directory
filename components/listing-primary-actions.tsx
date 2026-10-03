'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/analytics-client';
import { slugify } from '@/lib/site';
import { ContactIcon } from './contact-icon';
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
  const contacts = Number(Boolean(phone)) + Number(Boolean(whatsapp)) + Number(Boolean(mapsUrl));

  return (
    <>
      <div className={`${styles.primaryActions} ${surface === 'light' ? styles.onLight : ''}`} data-contacts={contacts} aria-label="التواصل مع النشاط والوصول إليه">
        {phone && <a className={`${styles.primaryAction} ${styles.callAction}`} href={`tel:${phone}`} aria-label={`اتصل بالنشاط على ${phone}`} onClick={() => trackEvent('Listing Call', data)}><ContactIcon kind="call" animate className={styles.actionGlyph} /><span className={styles.actionCopy}><strong><span className={styles.desktopLabel}>اتصال الآن</span><span className={styles.mobileLabel}>اتصال</span></strong><small dir="ltr">{phone}</small></span></a>}
        {whatsapp && <a className={`${styles.primaryAction} ${styles.whatsappAction}`} href={whatsapp} target="_blank" rel="noreferrer" aria-label="راسل النشاط عبر واتساب" onClick={() => trackEvent('Listing WhatsApp', data)}><ContactIcon kind="whatsapp" animate className={styles.actionGlyph} /><span className={styles.actionCopy}><strong>واتساب</strong><small>راسل النشاط</small></span></a>}
        {mapsUrl && <a className={`${styles.primaryAction} ${styles.mapAction}`} href={mapsUrl} target="_blank" rel="noreferrer" aria-label={mapLabel === 'بحث بالعنوان' ? 'ابحث عن عنوان النشاط على خرائط Google' : 'افتح الاتجاهات إلى النشاط على خرائط Google'} onClick={() => trackEvent('Listing Map Opened', data)}><ContactIcon kind="map" animate className={styles.actionGlyph} /><span className={styles.actionCopy}><strong><span className={styles.desktopLabel}>{mapLabel}</span><span className={styles.mobileLabel}>{mapLabel === 'بحث بالعنوان' ? 'الخريطة' : mapLabel}</span></strong><small>خرائط Google</small></span></a>}
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
