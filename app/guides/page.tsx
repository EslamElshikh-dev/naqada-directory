import type { Metadata } from 'next';
import Link from 'next/link';
import { villageGuides } from '@/lib/village-guides';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'أدلة قرى ونجوع مركز نقادة',
  description: 'مقالات محلية غنية وموثقة عن قرى ونجوع مركز نقادة: الموقع والخدمات والحياة المحلية والمصادر والأسئلة الشائعة، بروح صعيدية خفيفة وبدون اختلاق.',
  path: '/guides',
});

export default function GuidesPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'أدلة قرى ونجوع مركز نقادة',
        url: `${siteConfig.url}/guides`,
        description: 'سلسلة مقالات محلية موثقة عن قرى ونجوع مركز نقادة بمحافظة قنا.',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: villageGuides.length,
          itemListElement: villageGuides.map((guide, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: guide.title,
            url: `${siteConfig.url}/guides/${guide.slug}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'أدلة القرى والنجوع', item: `${siteConfig.url}/guides` },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="guides-hero">
        <div className="shell guides-hero__grid">
          <div>
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><span>أدلة القرى والنجوع</span></nav>
            <span className="eyebrow">محتوى محلي موثق</span>
            <h1>حكاية المكان… <em>بمعلومة لها أصل</em></h1>
            <p>سلسلة مقالات مستقلة عن قرى ونجوع مركز نقادة. نربط الجغرافيا بالخدمات والتاريخ المحلي، ونؤرّخ المعلومة القديمة بدل تقديمها كأنها حدثت أمس.</p>
          </div>
          <aside className="guides-hero__aside">
            <strong>{villageGuides.length.toLocaleString('ar-EG')}</strong>
            <span>مقالات افتتاحية طويلة، لكل واحدة نية بحث مستقلة وFAQ ومصادر وروابط داخلية إلى الدليل.</span>
          </aside>
        </div>
      </section>

      <section className="shell page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">ابدأ من بشلاو</span>
            <h2>كل قرية لها مقالها… مش نسخ ولصق مع تغيير الاسم</h2>
            <p>المحتوى يختلف بحسب ما أمكن توثيقه لكل موضع: مياه، تعليم، طريق، تراث، مجتمع أو خدمات عامة.</p>
          </div>
        </div>
        <div className="guides-grid">
          {villageGuides.map((guide, index) => (
            <Link className="guide-card" href={`/guides/${guide.slug}`} key={guide.slug}>
              <div className="guide-card__meta">
                <span>#{(index + 1).toLocaleString('ar-EG')}</span>
                <span>{guide.localityName}</span>
                <span>{guide.readingMinutes.toLocaleString('ar-EG')} دقائق قراءة</span>
              </div>
              <h2>{guide.title}</h2>
              <p>{guide.excerpt}</p>
              <span className="guide-card__cta">اقرأ المقال كاملًا ←</span>
            </Link>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
