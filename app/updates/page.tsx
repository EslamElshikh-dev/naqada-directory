import type { Metadata } from 'next';
import Link from 'next/link';
import { ListingCard } from '@/components/listing-card';
import { businesses, canonicalLocalityName, meta } from '@/lib/data';
import { formatDate, jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'آخر تحديثات دليل نقادة',
  description: 'تابع أحدث سجلات الأنشطة والخدمات التي تمت مراجعتها داخل دليل نقادة، مع تاريخ المراجعة وروابط الوصول والتفاصيل.',
  alternates: { canonical: '/updates' },
};

export default function UpdatesPage() {
  const recent = [...businesses]
    .filter((item) => Boolean(item.checked))
    .sort((a, b) => (b.checked || '').localeCompare(a.checked || '') || (b.reviews || 0) - (a.reviews || 0))
    .slice(0, 24);
  const latestDate = recent[0]?.checked || meta.updatedAt;
  const localityCount = new Set(recent.map((item) => canonicalLocalityName(item.locality))).size;
  const categoryCount = new Set(recent.map((item) => item.category)).size;
  const pageUrl = `${siteConfig.url}/updates`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'آخر تحديثات دليل نقادة',
        url: pageUrl,
        description: 'أحدث سجلات الأنشطة والخدمات التي تمت مراجعتها داخل دليل نقادة.',
        dateModified: latestDate,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: recent.length,
          itemListElement: recent.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'آخر التحديثات', item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="detail-hero">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><span>آخر التحديثات</span></nav>
          <span className="eyebrow">حركة البيانات داخل الدليل</span>
          <h1>آخر تحديثات <em>دليل نقادة</em></h1>
          <p>صفحة تجمع السجلات التي تمت مراجعتها مؤخرًا، حتى تعرف ما الذي أضيف أو أُعيد التحقق منه بدل الاعتماد على قائمة ثابتة بلا تاريخ.</p>
          <div className="hero-inline-stats">
            <span><b>{recent.length.toLocaleString('ar-EG')}</b> سجلًا حديث المراجعة</span>
            <span><b>{localityCount.toLocaleString('ar-EG')}</b> موضعًا</span>
            <span><b>{categoryCount.toLocaleString('ar-EG')}</b> قسمًا</span>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <div><span className="eyebrow eyebrow--dark">آخر مراجعة: {formatDate(latestDate)}</span><h2>سجلات راجعنا بياناتها مؤخرًا</h2><p>تاريخ المراجعة يعني آخر فحص مسجل داخل قاعدة الدليل، ولا يعني اعتمادًا حكوميًا للنشاط.</p></div>
          <Link href="/directory" className="text-link">البحث في كل الدليل ←</Link>
        </div>
        <div className="listing-grid">{recent.map((item) => <ListingCard key={item.id} listing={item} compact />)}</div>
      </section>

      <section className="section section--muted">
        <div className="shell methodology">
          <div><span className="eyebrow eyebrow--dark">لماذا هذه الصفحة؟</span><h2>مؤشر واضح على حداثة الدليل</h2><p>نربط كل تحديث بصفحة النشاط والموضع والتصنيف، ما يجعل اكتشاف المحتوى الجديد أسهل للمستخدم ومحركات البحث.</p><Link href="/about" className="text-link">منهجية البيانات ←</Link></div>
          <div className="methodology__grid">
            <article><b>01</b><h3>مراجعة قابلة للتتبع</h3><p>السجلات المنشورة تحمل تاريخ مراجعة داخليًا ويظهر التاريخ في صفحة التفاصيل.</p></article>
            <article><b>02</b><h3>روابط داخلية أعمق</h3><p>كل سجل حديث يقود إلى نشاط وتصنيف وموضع، بدل أن يبقى المحتوى معزولًا.</p></article>
            <article><b>03</b><h3>لا أخبار مصطنعة</h3><p>هذه الصفحة تعرض تغييرات بيانات فعلية فقط؛ الأخبار المحلية ستظل مسارًا منفصلًا بمصادر واضحة.</p></article>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
