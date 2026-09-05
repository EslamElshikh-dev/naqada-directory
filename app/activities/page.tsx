import type { Metadata } from 'next';
import Link from 'next/link';
import { CategoryVisual } from '@/components/category-visual';
import { activityLandings, getBusinessesForActivity } from '@/lib/activity-landings';
import { canonicalLocalityName, localities } from '@/lib/data';
import { jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'أنشطة وخدمات نقادة بالأسماء',
  description: 'تصفح أشهر أنواع الأنشطة والخدمات في مركز نقادة، من الصيدليات والمدارس والمطاعم إلى مواد البناء والبنوك، مع صفحة مستقلة لكل نشاط مسجل.',
  alternates: { canonical: '/activities' },
};

export default function ActivitiesPage() {
  const totalBusinesses = new Set(activityLandings.flatMap((activity) => getBusinessesForActivity(activity).map((item) => item.id))).size;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'أنشطة وخدمات نقادة بالأسماء',
    url: `${siteConfig.url}/activities`,
    inLanguage: 'ar-EG',
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: activityLandings.length,
      itemListElement: activityLandings.map((activity, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: activity.name,
        url: `${siteConfig.url}/activities/${encodeURIComponent(activity.slug)}`,
      })),
    },
  };

  return (
    <main id="main-content" className="page-main">
      <section className="catalog-hero">
        <div className="shell catalog-hero__grid">
          <div>
            <nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>الأنشطة</span></nav>
            <span className="eyebrow">وصول مباشر حسب نوع النشاط</span>
            <h1>أنشطة وخدمات <em>نقادة بالأسماء</em></h1>
            <p>اختر ما تبحث عنه لتصل إلى الأسماء المنشورة والعناوين والهواتف وروابط الخرائط داخل مدينة نقادة وقراها ونجوعها.</p>
          </div>
          <aside className="catalog-hero__summary">
            <span>تغطية صفحات الأنشطة</span>
            <div className="catalog-hero__metrics">
              <span><b>{activityLandings.length.toLocaleString('ar-EG')}</b><small>نوع نشاط مطلوب</small></span>
              <span><b>{totalBusinesses.toLocaleString('ar-EG')}</b><small>اسمًا مرتبطًا</small></span>
              <span><b>{localities.length.toLocaleString('ar-EG')}</b><small>موضعًا داخل نقادة</small></span>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell page-section">
        <div className="section-heading">
          <div><span className="eyebrow eyebrow--dark">ابحث بنوع الخدمة</span><h2>أشهر الأنشطة في مركز نقادة</h2><p>كل بطاقة تقود إلى صفحة قابلة للفهرسة تعرض الأسماء الحقيقية المنشورة ومناطق وجودها.</p></div>
        </div>
        <div className="category-grid">
          {activityLandings.map((activity, index) => {
            const items = getBusinessesForActivity(activity);
            const localityCount = new Set(items.map((item) => canonicalLocalityName(item.locality))).size;
            return (
              <Link key={activity.slug} href={`/activities/${activity.slug}`} className="category-card">
                <div className="category-card__visual"><CategoryVisual category={activity.visualCategory} /><span>{String(index + 1).padStart(2, '0')}</span></div>
                <h3>{activity.name}</h3>
                <p>{activity.description}</p>
                <div className="category-card__footer"><b>{items.length.toLocaleString('ar-EG')} اسمًا · {localityCount.toLocaleString('ar-EG')} موضعًا</b><span>عرض الأسماء ←</span></div>
              </Link>
            );
          })}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
