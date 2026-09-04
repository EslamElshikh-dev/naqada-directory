import Link from 'next/link';
import type { DirectoryItem } from '@/lib/types';
import { cleanPhone, isSafeExternalUrl, slugify, verificationLabel } from '@/lib/site';
import { CategoryVisual } from './category-visual';

function ActionIcon({ name }: { name: 'arrow' | 'phone' | 'map' }) {
  const paths = {
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    phone: <path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-4-1-1.2 2.1a15.3 15.3 0 0 1-9.9-9.9L8 7 7 3Z"/>,
    map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function ListingCard({ listing, compact = false }: { listing: DirectoryItem; compact?: boolean }) {
  const phone = cleanPhone(listing.phone);
  const locality = listing.locality || 'مركز نقادة';
  const hasMapReference = isSafeExternalUrl(listing.mapsUrl);
  return (
    <article className={`listing-card${compact ? ' listing-card--compact' : ''}`}>
      <div className="listing-card__head">
        <CategoryVisual category={listing.category} size="sm" />
        <div className="listing-card__eyebrow">
          <div><Link href={`/directory/${slugify(listing.category)}`}>{listing.subcategory || listing.category}</Link><small>{listing.category}</small></div>
          {hasMapReference && <span className="source-chip"><i /> موثّق بالخرائط</span>}
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
        <Link className="button button--primary" href={`/listing/${listing.slug}`}><span>عرض التفاصيل</span><ActionIcon name="arrow" /></Link>
        {phone && <a className="button button--soft" href={`tel:${phone}`} aria-label={`الاتصال بـ ${listing.name}`}><ActionIcon name="phone" /><span>اتصال</span></a>}
        {hasMapReference && <a className="button button--ghost" href={listing.mapsUrl || '#'} target="_blank" rel="noreferrer" aria-label={`فتح موقع ${listing.name} على الخريطة`}><ActionIcon name="map" /><span>الخريطة</span></a>}
      </div>
    </article>
  );
}
