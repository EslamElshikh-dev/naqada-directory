'use client';

import { trackEvent } from '@/lib/analytics-client';
import { slugify } from '@/lib/site';
import { ActionIcon } from './action-icon';
import styles from './listing-primary-actions.module.css';

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
  const villageHref = `/villages/${slugify(locality)}`;
  const similarHref = `/directory?category=${encodeURIComponent(category)}&locality=${encodeURIComponent(locality)}`;
  const preferredContact = phone
    ? { href: `tel:${phone}`, label: 'اتصال', event: 'Listing Call', external: false }
    : whatsapp
      ? { href: whatsapp, label: 'واتساب', event: 'Listing WhatsApp', external: true }
      : null;

  return (
    <>
      <div className="detail-actions">
        {phone && <a className="button button--light" href={`tel:${phone}`} onClick={() => trackEvent('Listing Call', data)}><ActionIcon name="call" /><span>اتصال الآن</span></a>}
        {whatsapp && <a className="button button--whatsapp" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing WhatsApp', data)}><ActionIcon name="call" /><span>واتساب</span></a>}
        {mapsUrl && <a className="button button--outline-light" href={mapsUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing Map Opened', data)}><ActionIcon name="map" /><span>فتح الخريطة</span></a>}
      </div>

      <nav className={styles.discovery} aria-label="استكشاف مرتبط بالنشاط">
        <a href={villageHref} onClick={() => trackEvent('Listing Village Opened', data)}>
          <ActionIcon name="map" />
          <span>دليل {locality}</span>
        </a>
        <a href={similarHref} onClick={() => trackEvent('Listing Similar Opened', data)}>
          <ActionIcon name="arrow" />
          <span>بدائل من {category} في {locality}</span>
        </a>
      </nav>

      <nav className={`${styles.mobileDock} listing-mobile-discovery-dock`} aria-label="إجراءات سريعة للنشاط">
        {preferredContact && (
          <a
            href={preferredContact.href}
            {...(preferredContact.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            onClick={() => trackEvent(preferredContact.event, data)}
          >
            <ActionIcon name="call" />
            <span>{preferredContact.label}</span>
          </a>
        )}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('Listing Map Opened', data)}>
            <ActionIcon name="map" />
            <span>الخريطة</span>
          </a>
        )}
        <a href={villageHref} onClick={() => trackEvent('Listing Village Opened', data)}>
          <ActionIcon name="map" />
          <span>القرية</span>
        </a>
        <a href={similarHref} onClick={() => trackEvent('Listing Similar Opened', data)}>
          <ActionIcon name="arrow" />
          <span>مشابه</span>
        </a>
      </nav>
    </>
  );
}
