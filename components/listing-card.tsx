import Link from 'next/link';
import { canonicalLocalityName } from '@/lib/data';
import type { DirectoryItem } from '@/lib/types';
import { cleanPhone, isSafeExternalUrl, slugify, verificationLabel } from '@/lib/site';
import { BusinessMedia } from './business-media';
import { CategoryVisual } from './category-visual';
import { ActionIcon } from './action-icon';

export function ListingCard({ listing, compact = false }: { listing: DirectoryItem; compact?: boolean }) {
  const phone = cleanPhone(listing.phone);
  const locality = canonicalLocalityName(listing.locality);
  const hasMapReference = isSafeExternalUrl(listing.mapsUrl);
  const detailHref = `/listing/${listing.slug}/`;
  return (
    <article className={`listing-card${compact ? ' listing-card--compact' : ''}`}>
      <BusinessMedia businessId={listing.id} fallbackCategory={listing.category} businessName={listing.name} subcategory={listing.subcategory} locality={locality} />
      <div className="listing-card__head">
        <CategoryVisual category={listing.category} size="sm" />
        <div className="listing-card__eyebrow">
          <div><Link href={`/directory/${slugify(listing.category)}`}>{listing.subcategory || listing.category}</Link><small>{listing.category}</small></div>
          {hasMapReference && <span className="source-chip"><i /> موثّق بالخرائط</span>}
        </div>
      </div>
      <div className="listing-card__body">
        <h3><a href={detailHref}>{listing.name}</a></h3>
        <p className="listing-card__location"><ActionIcon name="map" /> <span>{listing.address || `${locality}، مركز نقادة، قنا`}</span></p>
        <div className="listing-card__meta">
          <Link href={`/villages/${slugify(locality)}`}>{locality}</Link>
          {typeof listing.rating === 'number' && <span className="rating" aria-label={`التقييم ${listing.rating} من 5`}>★ {listing.rating.toLocaleString('ar-EG')}{listing.reviews ? ` (${listing.reviews.toLocaleString('ar-EG')})` : ''}</span>}
          <span>{verificationLabel(listing.verification)}</span>
        </div>
      </div>
      <div className="listing-card__actions">
        <a className="button button--primary" href={detailHref}><span>عرض التفاصيل</span><ActionIcon name="arrow" /></a>
        {phone && <a className="button button--soft" href={`tel:${phone}`} aria-label={`الاتصال بـ ${listing.name}`}><ActionIcon name="call" /><span>اتصال</span></a>}
        {hasMapReference && <a className="button button--ghost" href={listing.mapsUrl || '#'} target="_blank" rel="noreferrer" aria-label={`فتح موقع ${listing.name} على الخريطة`}><ActionIcon name="map" /><span>الخريطة</span></a>}
      </div>
    </article>
  );
}
