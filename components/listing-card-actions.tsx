'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/analytics-client';
import { ActionIcon } from './action-icon';
import { ContactIcon } from './contact-icon';
import styles from './listing-discovery.module.css';

export function ListingCardActions({
  detailHref,
  phone,
  whatsapp,
  mapsUrl,
  localityHref,
  similarHref,
  locality,
  category,
  listingSlug,
  listingName,
}: {
  detailHref: string;
  phone: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  localityHref: string;
  similarHref: string;
  locality: string;
  category: string;
  listingSlug: string;
  listingName: string;
}) {
  const data = { locality, category, listingSlug };

  return (
    <>
      <div className={`listing-card__actions ${styles.cardActions}`} data-contacts={Number(Boolean(phone)) + Number(Boolean(whatsapp)) + Number(Boolean(mapsUrl))}>
        <Link className={`button button--primary ${styles.detailsAction}`} href={detailHref} onClick={() => trackEvent('Listing Detail Opened', data)}>
          <span>عرض التفاصيل</span><ActionIcon name="arrow" />
        </Link>
        {phone && <a className="button button--soft" href={`tel:${phone}`} aria-label={`الاتصال بـ ${listingName}`} onClick={() => trackEvent('Listing Call', data)}><ContactIcon kind="call" compact /><span>اتصال</span></a>}
        {whatsapp && <a className="button button--whatsapp" href={whatsapp} target="_blank" rel="noreferrer" aria-label={`مراسلة ${listingName} عبر واتساب`} onClick={() => trackEvent('Listing WhatsApp', data)}><ContactIcon kind="whatsapp" compact /><span>واتساب</span></a>}
        {mapsUrl && <a className={`button button--ghost ${styles.mapCardAction}`} href={mapsUrl} target="_blank" rel="noreferrer" aria-label={`فتح موقع ${listingName} على الخريطة`} onClick={() => trackEvent('Listing Map Opened', data)}><ContactIcon kind="map" compact /><span>الاتجاهات</span></a>}
      </div>
      <nav className={`listing-card__discovery ${styles.cardDiscovery}`} aria-label={`استكشف حول ${listingName}`}>
        <Link href={localityHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'locality' })}>دليل {locality}<span aria-hidden="true">←</span></Link>
        <Link href={similarHref} prefetch={false} onClick={() => trackEvent('Listing Discovery Shortcut', { ...data, target: 'similar' })}>أنشطة مشابهة في {locality}<span aria-hidden="true">←</span></Link>
      </nav>
    </>
  );
}
