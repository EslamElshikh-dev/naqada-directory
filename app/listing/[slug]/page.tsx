import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListingCard } from '@/components/listing-card';
import { BrandMark } from '@/components/site-shell';
import { businesses, getBusinessBySlug, relatedBusinesses } from '@/lib/data';
import { cleanPhone, formatDate, isSafeExternalUrl, siteConfig, slugify, verificationLabel, whatsappUrl } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return businesses.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = getBusinessBySlug(slug);
  if (!listing) return {};
  const locality = listing.locality || 'مركز نقادة';
  return {
    title: `${listing.name} — ${locality}`,
    description: `${listing.subcategory || listing.category} في ${locality}. ${listing.address || 'العنوان ووسائل الوصول المتاحة داخل دليل نقادة.'}`,
    alternates: { canonical: `/listing/${listing.slug}` },
  };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = getBusinessBySlug(slug);
  if (!listing) notFound();
  const locality = listing.locality || 'مركز نقادة';
  const phone = cleanPhone(listing.phone);
  const whatsapp = whatsappUrl(listing.phone);
  const related = relatedBusinesses(listing);
  const canonicalUrl = `${siteConfig.url}/listing/${encodeURIComponent(listing.slug)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.name,
    url: canonicalUrl,
    telephone: phone || undefined,
    address: { '@type': 'PostalAddress', streetAddress: listing.address || undefined, addressLocality: locality, addressRegion: 'قنا', addressCountry: 'EG' },
    hasMap: isSafeExternalUrl(listing.mapsUrl) ? listing.mapsUrl : undefined,
    additionalType: listing.subcategory || listing.category,
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
            <div className="detail-actions">
              {phone && <a className="button button--light" href={`tel:${phone}`}>اتصال الآن</a>}
              {whatsapp && <a className="button button--whatsapp" href={whatsapp} target="_blank" rel="noreferrer">واتساب</a>}
              {isSafeExternalUrl(listing.mapsUrl) && <a className="button button--outline-light" href={listing.mapsUrl || '#'} target="_blank" rel="noreferrer">فتح الخريطة ↗</a>}
            </div>
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
            <div><span>الموضع</span><strong>{locality}{listing.parentLocality ? ` — ${listing.parentLocality}` : ''}</strong></div>
            <div><span>العنوان</span><strong>{listing.address || 'لا يتوفر عنوان تفصيلي'}</strong></div>
            <div><span>الهاتف</span><strong dir="ltr">{listing.phone || 'غير منشور'}</strong></div>
            <div><span>ساعات العمل</span><strong>{listing.hours || 'غير متاحة'}</strong></div>
            <div><span>التقييم لدى المصدر</span><strong>{typeof listing.rating === 'number' ? `${listing.rating.toLocaleString('ar-EG')} من 5${listing.reviews ? ` · ${listing.reviews.toLocaleString('ar-EG')} مراجعة` : ''}` : 'غير متاح'}</strong></div>
            <div><span>آخر مراجعة للبيانات</span><strong>{formatDate(listing.checked)}</strong></div>
          </div>
          <div className="source-panel"><span>مصدر الوصول</span><strong>{listing.placeId ? 'سجل مرتبط بمعرّف مكان على خرائط Google' : 'سجل محلي منشور'}</strong><p>{listing.notes || 'تم تنظيم البيانات من المصدر المتاح، وقد تتغير أوقات العمل أو وسائل الاتصال.'}</p>{isSafeExternalUrl(listing.mapsUrl) && <a href={listing.mapsUrl || '#'} target="_blank" rel="noreferrer">مراجعة المصدر على الخريطة ↗</a>}</div>
          <div className="update-panel" id="update-data"><div><span>هل وجدت معلومة تحتاج تصحيحًا؟</span><p>راجع منهج الدليل وطريقة إرسال تحديث موثّق للسجل.</p></div><Link href="/about#updates" className="button button--ghost">تصحيح البيانات</Link></div>
        </article>
        <aside className="detail-aside">
          <span className="eyebrow eyebrow--dark">وصول سريع</span><h2>خدمات مرتبطة</h2>
          <div className="detail-aside__links"><Link href={`/directory/${slugify(listing.category)}`}>كل {listing.category}</Link><Link href={`/villages/${slugify(locality)}`}>دليل {locality}</Link><Link href="/directory">البحث في كل الدليل</Link></div>
          <p className="detail-aside__note">الدليل معلوماتي مستقل. تحقّق من السعر والمواعيد وتوفر الخدمة مباشرة مع مقدمها.</p>
        </aside>
      </section>

      {related.length > 0 && <section className="section section--muted"><div className="shell"><div className="section-heading"><div><span className="eyebrow eyebrow--dark">قد يفيدك أيضًا</span><h2>أماكن وخدمات قريبة في التصنيف أو الموضع</h2></div></div><div className="listing-grid">{related.map((item) => <ListingCard key={item.id} listing={item} compact />)}</div></div></section>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
