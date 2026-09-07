import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BusinessMedia } from '@/components/business-media';
import { ListingCard } from '@/components/listing-card';
import { ListingPrimaryActions } from '@/components/listing-primary-actions';
import { ListingRating } from '@/components/listing-rating';
import { ShareActions } from '@/components/share-actions';
import { BrandMark } from '@/components/site-shell';
import { getBusinessMedia } from '@/lib/business-media';
import { businesses, canonicalLocalityName, getBusinessBySlug, relatedBusinesses } from '@/lib/data';
import { buildPageMetadata, businessSummary, cleanPhone, formatDate, isSafeExternalUrl, jsonLdStringify, schemaTypeForBusiness, siteConfig, slugify, truncateMetaDescription, verificationLabel, whatsappUrl } from '@/lib/site';
import styles from './listing-detail.module.css';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return businesses.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = getBusinessBySlug(slug);
  if (!listing) return {};
  const media = getBusinessMedia(listing.id);
  const locality = canonicalLocalityName(listing.locality);
  const description = truncateMetaDescription(listing.description || businessSummary({ ...listing, locality }));
  return buildPageMetadata({
    title: `${listing.name} في ${locality}`,
    description,
    path: `/listing/${listing.slug}`,
    socialImage: media ? { url: media.imageUrl, alt: media.imageAlt } : undefined,
  });
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = getBusinessBySlug(slug);
  if (!listing) notFound();
  const media = getBusinessMedia(listing.id);
  const locality = canonicalLocalityName(listing.locality);
  const parentLocality = listing.parentLocality || (listing.locality?.includes('/') ? listing.locality.split('/').slice(1).join('/').trim() : null);
  const phone = cleanPhone(listing.phone);
  const whatsapp = whatsappUrl(listing.phone);
  const safeMapsUrl = isSafeExternalUrl(listing.mapsUrl) ? listing.mapsUrl : null;
  const safeMediaSourceUrl = media && isSafeExternalUrl(media.sourceUrl) ? media.sourceUrl : null;
  const related = relatedBusinesses(listing);
  const canonicalUrl = `${siteConfig.url}/listing/${encodeURIComponent(listing.slug)}`;
  const categoryUrl = `${siteConfig.url}/directory/${encodeURIComponent(slugify(listing.category))}`;
  const correctionUrl = `/contribute?type=correction&name=${encodeURIComponent(listing.name)}&category=${encodeURIComponent(listing.category)}&locality=${encodeURIComponent(locality)}&listing=${encodeURIComponent(listing.slug)}`;
  const summary = listing.description || businessSummary({ ...listing, locality });
  const completenessSignals = [
    { label: 'عنوان تفصيلي', available: Boolean(listing.address) },
    { label: 'رقم هاتف', available: Boolean(phone) },
    { label: 'ساعات عمل', available: Boolean(listing.hours) },
    { label: 'رابط خريطة', available: Boolean(safeMapsUrl) },
    { label: 'صورة موثقة', available: Boolean(media) },
  ];
  const availableSignals = completenessSignals.filter((item) => item.available).length;
  const completenessPercent = Math.round((availableSignals / completenessSignals.length) * 100);
  const missingLabels = completenessSignals.filter((item) => !item.available).map((item) => item.label);
  const faqItems = [
    {
      question: `أين يقع ${listing.name}؟`,
      answer: listing.address
        ? `العنوان المنشور في دليل نقادة هو: ${listing.address}.`
        : `الموضع المنشور هو ${locality}، مركز نقادة، محافظة قنا، ولا يتوفر عنوان تفصيلي منشور حتى الآن.`,
    },
    {
      question: `هل يوجد رقم هاتف لـ ${listing.name}؟`,
      answer: phone
        ? `نعم، رقم الهاتف المنشور في السجل هو ${listing.phone}.`
        : 'لا يوجد رقم هاتف منشور في السجل الحالي. يمكن إرسال تصحيح موثق إذا توفر رقم عام للنشاط أو الجهة.',
    },
    {
      question: `ما مواعيد عمل ${listing.name}؟`,
      answer: listing.hours
        ? `ساعات العمل المنشورة هي: ${listing.hours}. يُفضّل التأكد من الموعد قبل الزيارة لأن المواعيد قد تتغير.`
        : 'لا توجد ساعات عمل منشورة في السجل الحالي. يُفضّل التحقق مباشرة قبل الزيارة إذا توفرت وسيلة اتصال.',
    },
    {
      question: `هل يتوفر موقع ${listing.name} على الخريطة؟`,
      answer: safeMapsUrl
        ? 'نعم، يتوفر رابط خريطة مرتبط بالسجل ويمكن فتحه من زر الخريطة في الصفحة.'
        : 'لا يوجد رابط خريطة منشور في السجل الحالي، لذلك يعرض الدليل العنوان النصي المتاح فقط.',
    },
  ];
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': schemaTypeForBusiness(listing),
        '@id': `${canonicalUrl}#entity`,
        name: listing.name,
        url: canonicalUrl,
        image: media?.imageUrl || undefined,
        telephone: phone || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: listing.address || undefined,
          addressLocality: locality,
          addressRegion: 'قنا',
          addressCountry: 'EG',
        },
        hasMap: safeMapsUrl || undefined,
        description: listing.description || (listing.subcategory ? `${listing.subcategory} ضمن ${listing.category} في ${locality}، مركز نقادة.` : `${listing.category} في ${locality}، مركز نقادة.`),
        mainEntityOfPage: canonicalUrl,
        areaServed: { '@type': 'AdministrativeArea', name: `${locality}، مركز نقادة، محافظة قنا` },
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
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
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
          <aside className="detail-hero__summary">
            {media ? <BusinessMedia businessId={listing.id} variant="detail" /> : <BrandMark />}
            <span>ملخص التحقق</span><strong>{verificationLabel(listing.verification)}</strong><p>آخر مراجعة: {formatDate(listing.checked)}</p>
          </aside>
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
          <section className="listing-description" aria-labelledby="listing-description-title">
            <span className="eyebrow eyebrow--dark">عن النشاط</span>
            <h2 id="listing-description-title">{listing.name}</h2>
            <p>{summary}</p>
          </section>

          <section className={styles.trustSection} aria-labelledby="listing-completeness-title">
            <div className={styles.trustHeading}>
              <div>
                <span className="eyebrow eyebrow--dark">شفافية السجل</span>
                <h2 id="listing-completeness-title">اكتمال البيانات المنشورة</h2>
              </div>
              <div className={styles.score}><strong>{completenessPercent.toLocaleString('ar-EG')}٪</strong><span>{availableSignals.toLocaleString('ar-EG')} من {completenessSignals.length.toLocaleString('ar-EG')} عناصر أساسية</span></div>
            </div>
            <div className={styles.completenessBar} role="progressbar" aria-label="نسبة اكتمال البيانات المنشورة" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completenessPercent}>
              <span style={{ width: `${completenessPercent}%` }} />
            </div>
            <div className={styles.signalGrid}>
              {completenessSignals.map((item) => <div key={item.label} className={`${styles.signal} ${item.available ? styles.signalAvailable : ''}`}><i aria-hidden="true" /><span>{item.label}</span></div>)}
            </div>
            <p className={styles.missingNote}>{missingLabels.length ? `غير منشور حتى الآن: ${missingLabels.join('، ')}. لا يضيف الدليل بيانات غير مؤكدة فقط لرفع نسبة الاكتمال.` : 'العناصر الأساسية الخمسة متاحة في السجل الحالي، مع بقاء ضرورة التحقق من أي تغيّر قبل الزيارة.'}</p>
          </section>

          <div className="source-panel"><span>مصدر الوصول</span><strong>{listing.placeId ? 'سجل مرتبط بمعرّف مكان على خرائط Google' : 'سجل محلي منشور'}</strong><p>{listing.notes || 'تم تنظيم البيانات من المصدر المتاح، وقد تتغير أوقات العمل أو وسائل الاتصال.'}</p><div className={styles.sourceLinks}>{safeMapsUrl && <a href={safeMapsUrl} target="_blank" rel="noreferrer">مراجعة المصدر على الخريطة ↗</a>}{safeMediaSourceUrl && <a href={safeMediaSourceUrl} target="_blank" rel="noreferrer">مصدر الصورة: {media?.sourceName} ↗</a>}</div></div>

          <section className={styles.faqSection} aria-labelledby="listing-faq-title">
            <span className="eyebrow eyebrow--dark">أسئلة مباشرة</span>
            <h2 id="listing-faq-title">أسئلة شائعة عن {listing.name}</h2>
            <p className={styles.faqIntro}>الإجابات التالية مبنية على البيانات المنشورة في السجل نفسه، وتوضح بوضوح ما هو متاح وما هو غير منشور.</p>
            <div className={styles.faqList}>
              {faqItems.map((item, index) => <details key={item.question} className={styles.faqItem} open={index === 0}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
            </div>
          </section>

          <ListingRating listingSlug={listing.slug} listingName={listing.name} />
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
      {listing.seoKeywords?.length ? <section className="listing-keywords" aria-labelledby="listing-keywords-title"><div className="shell">
        <span className="eyebrow eyebrow--dark">استكشف خدمات مشابهة</span>
        <h2 id="listing-keywords-title">كلمات مرتبطة بالنشاط</h2>
        <div className="listing-keywords__links">
          {listing.seoKeywords.map((keyword) => {
            const isLocal = keyword.includes('الخطارة');
            const searchTerm = keyword === 'حضانة' || keyword.includes('نقادة') || isLocal
              ? 'حضانة'
              : keyword.includes('أطفال') || keyword.includes('رياض') ? 'أطفال' : keyword;
            const href = `/directory?q=${encodeURIComponent(searchTerm)}${isLocal ? `&locality=${encodeURIComponent(locality)}` : ''}`;
            return <Link key={keyword} href={href}>{keyword}<span aria-hidden="true">←</span></Link>;
          })}
        </div>
      </div></section> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
