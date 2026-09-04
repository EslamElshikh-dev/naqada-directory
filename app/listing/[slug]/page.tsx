import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListingCard } from '@/components/listing-card';
import { ListingPrimaryActions } from '@/components/listing-primary-actions';
import { ShareActions } from '@/components/share-actions';
import { BrandMark } from '@/components/site-shell';
import { businesses, canonicalLocalityName, getBusinessBySlug, relatedBusinesses } from '@/lib/data';
import { buildPageMetadata, cleanPhone, formatDate, isSafeExternalUrl, jsonLdStringify, schemaTypeForBusiness, siteConfig, slugify, verificationLabel, whatsappUrl } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return businesses.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = getBusinessBySlug(slug);
  if (!listing) return {};
  const locality = canonicalLocalityName(listing.locality);
  const description = `${listing.subcategory || listing.category} في ${locality}. ${listing.address || 'العنوان ووسائل الوصول المتاحة داخل دليل نقادة.'}`;
  return buildPageMetadata({
    title: `${listing.name} — ${locality}`,
    description,
    path: `/listing/${listing.slug}`,
  });
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = getBusinessBySlug(slug);
  if (!listing) notFound();
  const locality = canonicalLocalityName(listing.locality);
  const parentLocality = listing.parentLocality || (listing.locality?.includes('/') ? listing.locality.split('/').slice(1).join('/').trim() : null);
  const phone = cleanPhone(listing.phone);
  const whatsapp = whatsappUrl(listing.phone);
  const safeMapsUrl = isSafeExternalUrl(listing.mapsUrl) ? listing.mapsUrl : null;
  const related = relatedBusinesses(listing);
  const canonicalUrl = `${siteConfig.url}/listing/${encodeURIComponent(listing.slug)}`;
  const categoryUrl = `${siteConfig.url}/directory/${encodeURIComponent(slugify(listing.category))}`;
  const correctionUrl = `/contribute?type=correction&name=${encodeURIComponent(listing.name)}&category=${encodeURIComponent(listing.category)}&locality=${encodeURIComponent(locality)}&listing=${encodeURIComponent(listing.slug)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': schemaTypeForBusiness(listing),
        '@id': `${canonicalUrl}#entity`,
        name: listing.name,
        url: canonicalUrl,
        telephone: phone || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: listing.address || undefined,
          addressLocality: locality,
          addressRegion: 'قنا',
          addressCountry: 'EG',
        },
        hasMap: safeMapsUrl || undefined,
        description: listing.subcategory ? `${listing.subcategory} ضمن ${listing.category} في ${locality}، مركز نقادة.` : `${listing.category} في ${locality}، مركز نقادة.`,
        dateModified: listing.checked || undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: listing.category, item: categoryUrl },
          { '@type': 'ListItem', position: 3, name: listing.name, item: canonicalUrl },
        ],
      },
    ],
  };
  return (
    <main id="main-content" className="page-main">
      <section className="detail-hero">
        <div className="shell detail-hero__grid">
          <div>
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/directory">الدليل</Link><span>/</span><Link href={`/directory/${slugify(listing.category)}`}>{listing.category}</Link><span>/</span><span>{listing.name}</span></nav>
            <div className="detail-hero__badges"><span>{listing.subcategory || listing.category}</span><Link href={`/villages/${slugify(locality)}`}>{locality}</Link></div>
            <h1>{listing.name}</h1>
            <p>{listing.address || `${locality}، مركز نقادة، محافظة قنا`}</p>
            <ListingPrimaryActions phone={phone} whatsapp={whatsapp} mapsUrl={safeMapsUrl} locality={locality} category={listing.category} listingSlug={listing.slug} />
          </div>
          <aside className="detail-hero__summary"><BrandMark /><span>ملخص التحقق</span><strong>{verificationLabel(listing.verification)}</strong><p>آخر مراجعة: {formatDate(listing.checked)}</p></aside>
        </div>
      </section>

      <section className="shell detail-layout">
        <article className="detail-card">
          <div className="detail-card__heading"><span className="eyebrow eyebrow--dark">تفاصيل المكان</span><h2>المعلومات المتاحة</h2></div>
          <div className="detail-grid">
            <div><span>التصنيف</span><strong>{listing.category}</strong></div>
            <div><span>نوع الخدمة</span><strong>{listing.subcategory || 'خدمة محلية'}</strong></div>
            <div><span>الموضع</span><strong>{locality}{parentLocality ? ` — ${parentLocality}` : ''}</strong></div>
            <div><span>العنوان</span><strong>{listing.address || 'لا يتوفر عنوان تفصيلي'}</strong></div>
            <div><span>الهاتف</span><strong dir="ltr">{listing.phone || 'غير منشور'}</strong></div>
            <div><span>ساعات العمل</span><strong>{listing.hours || 'غير متاحة'}</strong></div>
            <div><span>التقييم لدى المصدر</span><strong>{typeof listing.rating === 'number' ? `${listing.rating.toLocaleString('ar-EG')} من 5${listing.reviews ? ` · ${listing.reviews.toLocaleString('ar-EG')} مراجعة` : ''}` : 'غير متاح'}</strong></div>
            <div><span>آخر مراجعة للبيانات</span><strong>{formatDate(listing.checked)}</strong></div>
          </div>
          <div className="source-panel"><span>مصدر الوصول</span><strong>{listing.placeId ? 'سجل مرتبط بمعرّف مكان على خرائط Google' : 'سجل محلي منشور'}</strong><p>{listing.notes || 'تم تنظيم البيانات من المصدر المتاح، وقد تتغير أوقات العمل أو وسائل الاتصال.'}</p>{safeMapsUrl && <a href={safeMapsUrl} target="_blank" rel="noreferrer">مراجعة المصدر على الخريطة ↗</a>}</div>
          <ShareActions title={listing.name} locality={locality} listingSlug={listing.slug} />
          <div className="update-panel" id="update-data"><div><span>هل وجدت معلومة تحتاج تصحيحًا؟</span><p>أرسل طلبًا منظمًا مع مصدر عام داعم لتسريع المراجعة.</p></div><Link href={correctionUrl} className="button button--ghost">تصحيح البيانات</Link></div>
        </article>
        <aside className="detail-aside">
          <span className="eyebrow eyebrow--dark">وصول سريع</span><h2>خدمات مرتبطة</h2>
          <div className="detail-aside__links"><Link href={`/directory/${slugify(listing.category)}`}>كل {listing.category}</Link><Link href={`/villages/${slugify(locality)}`}>دليل {locality}</Link><Link href="/updates">آخر تحديثات الدليل</Link><Link href="/contribute">أضف نشاطًا أو صحح بيانات</Link><Link href="/directory">البحث في كل الدليل</Link></div>
          <p className="detail-aside__note">الدليل معلوماتي مستقل. تحقّق من السعر والمواعيد وتوفر الخدمة مباشرة مع مقدمها.</p>
        </aside>
      </section>

      {related.length > 0 && <section className="section section--muted"><div className="shell"><div className="section-heading"><div><span className="eyebrow eyebrow--dark">قد يفيدك أيضًا</span><h2>أماكن وخدمات قريبة في التصنيف أو الموضع</h2></div></div><div className="listing-grid">{related.map((item) => <ListingCard key={item.id} listing={item} compact />)}</div></div></section>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
