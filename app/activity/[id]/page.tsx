import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionIcon } from '@/components/action-icon';
import { ListingCover } from '@/components/listing-cover';
import { ListingPrimaryActions } from '@/components/listing-primary-actions';
import { ShareActions } from '@/components/share-actions';
import { getPublishedOwnerListing } from '@/lib/owner-listings';
import { ownerListingCoverPath, ownerListingPhotoPaths, ownerPhotoUrl } from '@/lib/owner-listing-photo';
import { activityMapLink } from '@/lib/activity-map';
import { buildPageMetadata, cleanPhone, jsonLdStringify, siteConfig, slugify, truncateMetaDescription, whatsappUrl } from '@/lib/site';
import styles from './activity.module.css';

type Props = { params: Promise<{ id: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = uuidPattern.test(id) ? await getPublishedOwnerListing(id) : null;
  if (!listing) return { title: 'النشاط غير متاح | دليل نقادة', robots: { index: false, follow: false } };
  const cover = ownerListingCoverPath(listing);
  return buildPageMetadata({
    title: `${listing.name} في ${listing.locality}`,
    description: truncateMetaDescription(listing.description), path: `/activity/${id}`,
    socialImage: cover ? { url: `${siteConfig.url}${ownerPhotoUrl(cover)}`, alt: `غلاف ${listing.name}` } : undefined,
  });
}

export default async function ActivityPage({ params }: Props) {
  const { id } = await params;
  const listing = uuidPattern.test(id) ? await getPublishedOwnerListing(id) : null;
  if (!listing) notFound();
  const coverPath = ownerListingCoverPath(listing);
  const photoPaths = ownerListingPhotoPaths(listing);
  const phone = cleanPhone(listing.phone);
  const whatsapp = whatsappUrl(listing.phone);
  const map = activityMapLink(listing);
  const pageUrl = `${siteConfig.url}/activity/${id}/`;
  const categoryHref = `/directory/${slugify(listing.category)}`;
  const localityHref = `/villages/${slugify(listing.locality)}`;
  const structuredData = {
    '@context': 'https://schema.org', '@graph': [{
      '@type': 'LocalBusiness', '@id': `${pageUrl}#activity`, name: listing.name,
      description: listing.description, url: pageUrl, telephone: listing.phone,
      address: { '@type': 'PostalAddress', streetAddress: listing.address,
        addressLocality: listing.locality, addressRegion: 'قنا', addressCountry: 'EG' },
      ...(photoPaths.length ? { image: photoPaths.map((path) => `${siteConfig.url}${ownerPhotoUrl(path)}`) } : {}),
      ...(map.hasPin ? { hasMap: map.url } : {}),
    }, {
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الدليل', item: `${siteConfig.url}/directory/` },
        { '@type': 'ListItem', position: 2, name: listing.category, item: `${siteConfig.url}${categoryHref}/` },
        { '@type': 'ListItem', position: 3, name: listing.name, item: pageUrl },
      ],
    }],
  };

  return <main id="main-content" className={`page-main ${styles.page}`}>
    <section className={styles.hero}>
      <div className="shell">
        <nav className={styles.breadcrumbs} aria-label="مسار التنقل"><Link href="/directory">الدليل</Link><span>/</span><Link href={categoryHref}>{listing.category}</Link><span>/</span><span>{listing.name}</span></nav>
        <div className={styles.profile}>
          <div className={styles.identity}>
            <div className={styles.identityTop}>
              <div className={styles.tags}><Link href={categoryHref}>{listing.category}</Link><Link href={localityHref}>{listing.locality}</Link></div>
              <span className={styles.badge}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor" opacity=".1"/><path d="m5.5 10 3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>منشور في الدليل</span>
            </div>
            <h1>{listing.name}</h1>
            <p className={styles.location}><ActionIcon name="pin" /><span>{listing.address}، {listing.locality}</span></p>
            <p className={styles.intro}>{truncateMetaDescription(listing.description, 110)}</p>
            <ListingPrimaryActions phone={phone} whatsapp={whatsapp} mapsUrl={map.url} mapLabel={map.label}
              locality={listing.locality} category={listing.category} listingSlug={id} surface="light" showDiscovery={false} />
            {!map.hasPin && <p className={styles.mapHint}>الخريطة تبحث بالعنوان؛ أكّد المكان مع صاحب النشاط.</p>}
          </div>
          <div className={styles.heroCover}><ListingCover src={coverPath ? ownerPhotoUrl(coverPath) : null}
            name={listing.name} category={listing.category} locality={listing.locality} detail /></div>
        </div>
      </div>
    </section>

    <div className={`shell ${styles.layout}`}>
      <div className={styles.content}>
        <section className={styles.details} aria-labelledby="activity-about-title">
          <header className={styles.sectionHead}><span className={styles.sectionMark}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span><div><span className={styles.kicker}>الخدمة اللي بتدور عليها</span><h2 id="activity-about-title">عن النشاط</h2></div></header>
          <p className={styles.description}>{listing.description}</p>
          <dl className={styles.facts}><div><dt>التصنيف</dt><dd><Link href={categoryHref}>{listing.category}</Link></dd></div><div><dt>القرية أو الموضع</dt><dd><Link href={localityHref}>{listing.locality}</Link></dd></div></dl>
        </section>
        {photoPaths.length > 0 && <section className={styles.gallery} aria-labelledby="activity-gallery-title">
          <div className={styles.galleryHead}><div><h2 id="activity-gallery-title">صور النشاط</h2><p>اضغط على الصورة لعرضها كاملة</p></div><span className={styles.photoCount}>{photoPaths.length === 1 ? 'صورة واحدة' : photoPaths.length === 2 ? 'صورتان' : `${photoPaths.length.toLocaleString('ar-EG')} صور`}</span></div>
          <div className={styles.photos}>{photoPaths.map((path, index) => <figure key={path}><a href={ownerPhotoUrl(path)} target="_blank" rel="noopener noreferrer" aria-label={`افتح صورة ${index + 1} من ${listing.name} كاملة`}><Image src={ownerPhotoUrl(path)} alt={`صورة ${index + 1} من ${listing.name}`} width={720} height={520} sizes={index === 0 ? '(max-width: 800px) 90vw, 760px' : '(max-width: 800px) 44vw, 380px'} unoptimized /><span className={styles.photoOpen} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-8 8M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg></span></a><figcaption>{path === coverPath ? 'غلاف النشاط' : `صورة ${(index + 1).toLocaleString('ar-EG')}`}</figcaption></figure>)}</div>
        </section>}
        <section className={styles.share} aria-labelledby="activity-share-title">
          <h2 id="activity-share-title">دلّ غيرك على المكان</h2><p className={styles.shareIntro}>ابعته للي محتاج الخدمة من أهل البلد.</p>
          <ShareActions title={listing.name} locality={listing.locality} listingSlug={id} />
          <nav className={styles.explore} aria-label="استكشف أنشطة قريبة"><Link href={`/directory?category=${encodeURIComponent(listing.category)}&locality=${encodeURIComponent(listing.locality)}`}><span>أنشطة مشابهة في {listing.locality}</span><ActionIcon name="arrow" /></Link><Link href={localityHref}><span>كل خدمات {listing.locality}</span><ActionIcon name="arrow" /></Link></nav>
          <Link className={styles.edit} href={`/contribute?edit=${id}`}>ده نشاطك؟ عدّل بياناته من حسابك <ActionIcon name="arrow" /></Link>
        </section>
      </div>

      <aside className={styles.side} aria-labelledby="activity-visit-title">
        <header className={styles.sideHead}><span className={styles.kicker}>قبل ما تروح</span><h2 id="activity-visit-title">بيانات الزيارة</h2></header>
        {phone && <div className={styles.visitFact}><span className={styles.visitIcon}><ActionIcon name="call" /></span><div><span>رقم النشاط</span><a href={`tel:${phone}`}><bdi dir="ltr">{listing.phone}</bdi></a></div></div>}
        <div className={styles.visitFact}><span className={styles.visitIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg></span><div><span>مواعيد العمل</span><strong>{listing.hours}</strong></div></div>
        <div className={styles.visitFact}><span className={styles.visitIcon}><ActionIcon name="pin" /></span><div><span>العنوان</span><strong>{listing.address}، {listing.locality}</strong></div></div>
        <a className={styles.visitMap} href={map.url} target="_blank" rel="noopener noreferrer"><ActionIcon name="map" />{map.hasPin ? 'افتح الاتجاهات' : 'ابحث عن العنوان على الخريطة'}</a>
        <p className={styles.visitNote}>المواعيد والبيانات من صاحب النشاط؛ اتصل قبل الزيارة.</p>
      </aside>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
  </main>;
}
