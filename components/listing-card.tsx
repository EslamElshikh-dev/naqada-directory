import Link from 'next/link';
import type { DirectoryItem } from '@/lib/types';
import { cleanPhone, isSafeExternalUrl, slugify, verificationLabel } from '@/lib/site';
import { CategoryVisual } from './category-visual';

export function ListingCard({ listing, compact = false }: { listing: DirectoryItem; compact?: boolean }) {
  const phone = cleanPhone(listing.phone);
  const locality = listing.locality || 'مركز نقادة';
  return (
    <article className={`listing-card${compact ? ' listing-card--compact' : ''}`}>
      <div className="listing-card__head">
        <CategoryVisual category={listing.category} size="sm" />
        <div className="listing-card__eyebrow">
          <Link href={`/directory/${slugify(listing.category)}`}>{listing.subcategory || listing.category}</Link>
          <span className="source-chip">مرجع خرائط</span>
        </div>
      </div>
      <div className="listing-card__body">
        <h3><Link href={`/listing/${listing.slug}`}>{listing.name}</Link></h3>
        <p className="listing-card__location">{listing.address || `${locality}، مركز نقادة، قنا`}</p>
        <div className="listing-card__meta">
          <Link href={`/villages/${slugify(locality)}`}>{locality}</Link>
          {typeof listing.rating === 'number' && <span className="rating" aria-label={`التقييم ${listing.rating} من 5`}>★ {listing.rating.toLocaleString('ar-EG')}{listing.reviews ? ` (${listing.reviews.toLocaleString('ar-EG')})` : ''}</span>}
          <span>{verificationLabel(listing.verification)}</span>
        </div>
      </div>
      <div className="listing-card__actions">
        <Link className="button button--primary" href={`/listing/${listing.slug}`}>التفاصيل</Link>
        {phone && <a className="button button--soft" href={`tel:${phone}`}>اتصال</a>}
        {isSafeExternalUrl(listing.mapsUrl) && <a className="button button--ghost" href={listing.mapsUrl || '#'} target="_blank" rel="noreferrer">الخريطة</a>}
      </div>
    </article>
  );
}
