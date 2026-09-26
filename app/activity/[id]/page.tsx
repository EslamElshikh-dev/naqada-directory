import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedOwnerListing } from '@/lib/owner-listings';
import { ownerPhotoUrl } from '@/lib/owner-listing-photo';
import { buildPageMetadata, jsonLdStringify, siteConfig, slugify, truncateMetaDescription } from '@/lib/site';
import styles from './activity.module.css';

type Props = { params: Promise<{ id: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = uuidPattern.test(id) ? await getPublishedOwnerListing(id) : null;
  if (!listing) return { title: 'النشاط غير متاح | دليل نقادة', robots: { index: false, follow: false } };
  return buildPageMetadata({
    title: `${listing.name} في ${listing.locality}`,
    description: truncateMetaDescription(listing.description),
    path: `/activity/${id}`,
    socialImage: undefined,
  });
}

export default async function ActivityPage({ params }: Props) {
  const { id } = await params;
  const listing = uuidPattern.test(id) ? await getPublishedOwnerListing(id) : null;
  if (!listing) notFound();
  const digits = listing.phone.replace(/\D/g, '');
  const whatsapp = /^01[0125][0-9]{8}$/.test(digits)
    ? `https://wa.me/20${digits.slice(1)}`
    : /^201[0125][0-9]{8}$/.test(digits) ? `https://wa.me/${digits}` : null;
  const pageUrl = `${siteConfig.url}/activity/${id}/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${pageUrl}#activity`,
    name: listing.name,
    description: listing.description,
    url: pageUrl,
    telephone: listing.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.locality,
      addressRegion: 'قنا',
      addressCountry: 'EG',
    },
    ...(listing.photo_paths.length ? { image: listing.photo_paths.map((path) => `${siteConfig.url}${ownerPhotoUrl(path)}`) } : {}),
  };
  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className="shell">
      <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/directory">الدليل</Link><span>/</span><Link href={`/directory/${slugify(listing.category)}`}>{listing.category}</Link><span>/</span><span>{listing.name}</span></nav>
      <span className={styles.badge}>مقدّم من صاحب النشاط · تمت مراجعته</span>
      <h1>{listing.name}</h1><p>{listing.address} · {listing.locality}</p>
      <div className={styles.actions}><a className={styles.primary} href={`tel:${listing.phone}`}>اتصل بالنشاط <span dir="ltr">{listing.phone}</span></a>{whatsapp && <a className={styles.secondary} href={whatsapp} target="_blank" rel="noopener noreferrer">تواصل عبر واتساب ↗</a>}</div>
    </div></section>
    <div className={`shell ${styles.layout}`}>
      <article className={styles.details}>
        <span className={styles.kicker}>عن المكان</span>
        <h2>إيه اللي بيقدمه {listing.name}؟</h2><p className={styles.description}>{listing.description}</p>
        <div className={styles.facts}><div><span>التصنيف</span><strong>{listing.category}</strong></div><div><span>القرية أو الموضع</span><strong>{listing.locality}</strong></div><div><span>العنوان</span><strong>{listing.address}</strong></div><div><span>مواعيد العمل</span><strong>{listing.hours}</strong></div><div><span>رقم الجوال</span><strong dir="ltr">{listing.phone}</strong></div></div>
        {listing.photo_paths.length > 0 && <section className={styles.gallery} aria-labelledby="activity-gallery-title"><span className={styles.kicker}>صور من صاحب النشاط</span><h2 id="activity-gallery-title">شوف المكان بعينك</h2><div className={styles.photos}>{listing.photo_paths.map((path, index) => <figure key={path}><Image src={ownerPhotoUrl(path)} alt={`صورة ${index + 1} من ${listing.name}`} width={720} height={520} sizes="(max-width: 720px) 92vw, 360px" unoptimized /><figcaption>صورة {index + 1} من صاحب النشاط</figcaption></figure>)}</div></section>}
      </article>
      <aside className={styles.side}><span className={styles.kicker}>قبل ما تروح</span><h2>اتأكد من المواعيد</h2><p>المواعيد والبيانات مقدمة من صاحب النشاط، وممكن تتغير. اتصل قبل الزيارة لو المشوار بعيد.</p><a href={`tel:${listing.phone}`}>اتصل واستفسر ←</a><hr/><Link href="/directory">ارجع لكل الأنشطة</Link></aside>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
  </main>;
}
