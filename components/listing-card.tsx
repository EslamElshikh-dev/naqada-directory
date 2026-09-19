import Link from 'next/link';
import { canonicalLocalityName } from '@/lib/data';
import type { DirectoryItem } from '@/lib/types';
import { cleanPhone, isSafeExternalUrl, slugify, verificationLabel, whatsappUrl } from '@/lib/site';
import { BusinessMedia } from './business-media';
import { CategoryVisual } from './category-visual';
import { ActionIcon } from './action-icon';
import { ListingCardActions } from './listing-card-actions';

export function ListingCard({ listing, compact = false }: { listing: DirectoryItem; compact?: boolean }) {
  const phone = cleanPhone(listing.phone);
  const whatsapp = whatsappUrl(listing.phone);
  const locality = canonicalLocalityName(listing.locality);
  const hasMapReference = isSafeExternalUrl(listing.mapsUrl);
  const mapsUrl = hasMapReference ? listing.mapsUrl : null;
  const detailHref = `/listing/${listing.slug}/`;
  const categoryHref = `/directory/${slugify(listing.category)}`;
  const localityHref = `/villages/${slugify(locality)}`;
  const similarHref = listing.subcategory
    ? `/directory?q=${encodeURIComponent(listing.subcategory)}&locality=${encodeURIComponent(locality)}`
    : `/directory?category=${encodeURIComponent(listing.category)}&locality=${encodeURIComponent(locality)}`;

  return (
    <article className={`listing-card${compact ? ' listing-card--compact' : ''}`}>
      <div className="listing-card__cover">
        <BusinessMedia businessId={listing.id} fallbackCategory={listing.category} businessName={listing.name} subcategory={listing.subcategory} locality={locality} />
        <Link className="listing-card__cover-link" href={detailHref} aria-label={`عرض تفاصيل ${listing.name}`} />
        <Link className="listing-card__category-mark" href={categoryHref} aria-label={`استكشف قسم ${listing.category}`}>
          <CategoryVisual category={listing.category} size="sm" />
        </Link>
        {hasMapReference && <span className="source-chip"><i /> موثّق على الخريطة</span>}
      </div>
      <div className="listing-card__head">
        <div className="listing-card__eyebrow">
          <div><Link href={categoryHref}>{listing.subcategory || listing.category}</Link><small>{listing.subcategory ? listing.category : `دليل ${locality}`}</small></div>
        </div>
      </div>
      <div className="listing-card__body">
        <h3><Link href={detailHref}>{listing.name}</Link></h3>
        <p className="listing-card__location"><ActionIcon name="map" /> <span>{listing.address || `${locality}، مركز نقادة، قنا`}</span></p>
        <div className="listing-card__meta">
          <Link href={localityHref}>{locality}</Link>
          {typeof listing.rating === 'number' && <span className="rating" aria-label={`التقييم ${listing.rating} من 5`}>★ {listing.rating.toLocaleString('ar-EG')}{listing.reviews ? ` (${listing.reviews.toLocaleString('ar-EG')})` : ''}</span>}
          <span>{verificationLabel(listing.verification)}</span>
        </div>
      </div>
      <ListingCardActions
        detailHref={detailHref}
        phone={phone}
        whatsapp={whatsapp}
        mapsUrl={mapsUrl}
        localityHref={localityHref}
        similarHref={similarHref}
        locality={locality}
        category={listing.category}
        listingSlug={listing.slug}
        listingName={listing.name}
      />
    </article>
  );
}
