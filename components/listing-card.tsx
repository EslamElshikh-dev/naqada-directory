import { NUMBER_LOCALE } from '@/lib/format-number';
import Link from 'next/link';
import { canonicalLocalityName } from '@/lib/data';
import type { DirectoryItem } from '@/lib/types';
import { cleanPhone, isSafeExternalUrl, slugify, verificationLabel, whatsappUrl } from '@/lib/site';
import { BusinessMedia } from './business-media';
import { CategoryVisual } from './category-visual';
import { ActionIcon } from './action-icon';
import { ListingCardActions } from './listing-card-actions';
import { ListingCover } from './listing-cover';
import { publicBusinessHref } from '@/lib/business-links';

export function ListingCard({ listing, compact = false }: { listing: DirectoryItem; compact?: boolean }) {
  const phone = cleanPhone(listing.phone);
  const whatsapp = whatsappUrl(listing.phone);
  const locality = canonicalLocalityName(listing.locality);
  const hasMapReference = isSafeExternalUrl(listing.mapsUrl);
  const mapsUrl = hasMapReference ? listing.mapsUrl : null;
  const detailHref = listing.detailHref || publicBusinessHref(listing);
  const categoryHref = `/directory/${slugify(listing.category)}`;
  const localityHref = `/villages/${slugify(locality)}`;
  const similarHref = listing.subcategory
    ? `/directory?q=${encodeURIComponent(listing.subcategory)}&locality=${encodeURIComponent(locality)}`
    : `/directory?category=${encodeURIComponent(listing.category)}&locality=${encodeURIComponent(locality)}`;

  return (
    <article className={`listing-card${compact ? ' listing-card--compact' : ''}`}>
      <div className="listing-card__cover">
        {listing.imageUrl || listing.id.startsWith('owner-') ? <ListingCover src={listing.imageUrl} name={listing.name} category={listing.category} locality={locality} /> :
          <BusinessMedia businessId={listing.id} fallbackCategory={listing.category} businessName={listing.name} subcategory={listing.subcategory} locality={locality} />}
        <Link prefetch={false} className="listing-card__cover-link" href={detailHref} aria-label={`عرض تفاصيل ${listing.name}`} />
        <Link prefetch={false} className="listing-card__category-mark" href={categoryHref} aria-label={`استكشف قسم ${listing.category}`}>
          <CategoryVisual category={listing.category} size="sm" />
        </Link>
        {hasMapReference && <span className="source-chip"><i /> موقع على الخريطة</span>}
      </div>
      <div className="listing-card__head">
        <div className="listing-card__eyebrow">
          <div><Link prefetch={false} href={categoryHref}>{listing.subcategory || listing.category}</Link><small>{listing.subcategory ? listing.category : `دليل ${locality}`}</small></div>
        </div>
      </div>
      <div className="listing-card__body">
        <h3><Link prefetch={false} href={detailHref}>{listing.name}</Link></h3>
        <p className="listing-card__location"><ActionIcon name="map" /> <span>{listing.address || `${locality}، مركز نقادة، قنا`}</span></p>
        <div className="listing-card__meta">
          <Link prefetch={false} href={localityHref}>{locality}</Link>
          {typeof listing.rating === 'number' && <span className="rating" title="التقييم لدى مصدر البيانات؛ التفاصيل في صفحة النشاط" aria-label={`التقييم لدى المصدر ${listing.rating} من 5`}>★ {listing.rating.toLocaleString(NUMBER_LOCALE)}{listing.reviews ? ` (${listing.reviews.toLocaleString(NUMBER_LOCALE)})` : ''}</span>}
          <Link prefetch={false} href="/about" title={verificationLabel(listing.verification)}>مصدر البيانات</Link>
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
