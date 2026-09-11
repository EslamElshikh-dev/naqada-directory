import Link from 'next/link';
import { businesses, canonicalLocalityName, localities } from '@/lib/data';
import { localCategoryHref } from '@/lib/discovery-routing';
import type { Business } from '@/lib/types';
import styles from './cross-discovery.module.css';

type CrossDiscoveryProps = {
  listing: Business;
};

function sameServiceMatches(listing: Business) {
  const locality = canonicalLocalityName(listing.locality);
  return businesses.filter((item) => {
    if (item.id === listing.id) return false;
    if (canonicalLocalityName(item.locality) !== locality) return false;
    if (listing.subcategory) return item.subcategory === listing.subcategory;
    return item.category === listing.category;
  });
}

function siblingServiceMatches(listing: Business) {
  const locality = canonicalLocalityName(listing.locality);
  const counts = new Map<string, number>();
  for (const item of businesses) {
    if (item.id === listing.id) continue;
    if (canonicalLocalityName(item.locality) !== locality) continue;
    if (item.category !== listing.category) continue;
    const label = item.subcategory || item.category;
    if (label === (listing.subcategory || listing.category)) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar')).slice(0, 4);
}

function otherLocalitiesWithService(listing: Business) {
  const current = canonicalLocalityName(listing.locality);
  const counts = new Map<string, number>();
  for (const item of businesses) {
    const locality = canonicalLocalityName(item.locality);
    if (locality === current) continue;
    const same = listing.subcategory ? item.subcategory === listing.subcategory : item.category === listing.category;
    if (!same) continue;
    counts.set(locality, (counts.get(locality) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ locality: localities.find((item) => item.name === name), count }))
    .filter((item): item is { locality: NonNullable<typeof item.locality>; count: number } => Boolean(item.locality))
    .sort((a, b) => b.count - a.count || a.locality.name.localeCompare(b.locality.name, 'ar'))
    .slice(0, 5);
}

export function CrossDiscovery({ listing }: CrossDiscoveryProps) {
  const locality = canonicalLocalityName(listing.locality);
  const serviceLabel = listing.subcategory || listing.category;
  const localPeers = sameServiceMatches(listing)
    .sort((a, b) => (b.reviews || 0) - (a.reviews || 0) || a.name.localeCompare(b.name, 'ar'))
    .slice(0, 4);
  const siblingServices = siblingServiceMatches(listing);
  const otherLocalities = otherLocalitiesWithService(listing);
  const categoryHref = localCategoryHref(listing.category, locality);

  if (!localPeers.length && !siblingServices.length && !otherLocalities.length) return null;

  return (
    <section className={styles.section} aria-labelledby="cross-discovery-title">
      <div className={styles.heading}>
        <div>
          <span>استكشف خيارات مرتبطة</span>
          <h2 id="cross-discovery-title">خدمات وبدائل مرتبطة بـ {listing.name}</h2>
        </div>
        <p>انتقل بين بدائل من نفس الخدمة داخل الموضع، وخدمات من المجال نفسه، ومواضع أخرى تتوفر فيها نتائج مشابهة.</p>
      </div>
      <div className={styles.grid}>
        <article className={styles.card}>
          <span>نفس الخدمة · {locality}</span>
          <h3>{serviceLabel} في {locality}</h3>
          <p>{localPeers.length ? `${localPeers.length.toLocaleString('ar-EG')} بدائل مختارة داخل الموضع نفسه.` : 'لا توجد بدائل منشورة من النوع نفسه داخل الموضع حاليًا.'}</p>
          <div className={styles.links}>
            {localPeers.map((item) => <Link key={item.id} href={`/listing/${item.slug}/`} prefetch={false}>{item.name}<span aria-hidden="true">←</span></Link>)}
            <Link href={`/directory?q=${encodeURIComponent(serviceLabel)}&locality=${encodeURIComponent(locality)}`} prefetch={false}>كل النتائج في {locality}<span aria-hidden="true">←</span></Link>
          </div>
        </article>

        <article className={styles.card}>
          <span>نفس المجال · {locality}</span>
          <h3>{listing.category} في {locality}</h3>
          <p>خدمات أخرى من المجال نفسه داخل القرية أو النجع.</p>
          <div className={styles.links}>
            {siblingServices.map(([label, count]) => <Link key={label} href={`/directory?q=${encodeURIComponent(label)}&locality=${encodeURIComponent(locality)}`} prefetch={false}>{label} <small>{count.toLocaleString('ar-EG')}</small><span aria-hidden="true">←</span></Link>)}
            <Link href={categoryHref} prefetch={false}>كل {listing.category} في {locality}<span aria-hidden="true">←</span></Link>
          </div>
        </article>

        <article className={styles.card}>
          <span>نفس الخدمة · مركز نقادة</span>
          <h3>{serviceLabel} في مواضع أخرى</h3>
          <p>انتقل إلى القرى والنجوع التي تحتوي على نتائج منشورة من نوع الخدمة نفسه.</p>
          <div className={styles.links}>
            {otherLocalities.map(({ locality: place, count }) => <Link key={place.slug} href={`/directory?q=${encodeURIComponent(serviceLabel)}&locality=${encodeURIComponent(place.name)}`} prefetch={false}>{place.name} <small>{count.toLocaleString('ar-EG')}</small><span aria-hidden="true">←</span></Link>)}
          </div>
        </article>
      </div>
    </section>
  );
}
