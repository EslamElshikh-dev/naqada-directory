import type { Metadata } from 'next';
import Link from 'next/link';
import { LocalityExplorer } from '@/components/locality-explorer';
import { BrandMark } from '@/components/site-shell';
import { businesses, localities } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'دليل قرى ونجوع نقادة | القرى والعزب والخدمات',
  description: 'دليل قرى ونجوع نقادة بمحافظة قنا: استكشف القرى والنجوع والعزب والمواضع الموثقة وافتح دليل كل قرية للوصول إلى الخدمات والأنشطة المسجلة فيها.',
  path: '/villages/',
});

export default function VillagesPage() {
  const kinds = new Set(localities.map((item) => item.type)).size;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل قرى ونجوع نقادة',
    url: `${siteConfig.url}/villages/`,
    inLanguage: 'ar-EG',
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: localities.length,
      itemListElement: localities.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `دليل ${item.name}`,
        url: `${siteConfig.url}/villages/${encodeURIComponent(item.slug)}/`,
      })),
    },
  };

  return (
    <main id="main-content" className="page-main">
      <section className="geo-hero">
        <div className="shell geo-hero__grid">
          <div>
            <nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>دليل القرى والنجوع</span></nav>
            <span className="eyebrow">الدليل الجغرافي المحلي لمركز نقادة</span>
            <h1>دليل قرى ونجوع <em>نقادة</em></h1>
            <p>اختر القرية أو النجع لفتح دليل محلي مستقل يجمع الخدمات والأنشطة والمعلومات المنشورة عن الموضع داخل مركز نقادة بمحافظة قنا.</p>
            <a href="#places" className="button button--light">استكشف دليل القرى</a>
          </div>
          <aside className="geo-hero__panel">
            <BrandMark />
            <strong>مركز نقادة · محافظة قنا</strong>
            <p>دليل مستقل لكل مدينة وقرية ونجع وعزبة، مع روابط مباشرة للأنشطة والخدمات المرتبطة بالمكان.</p>
            <div className="catalog-hero__metrics">
              <span><b>{localities.length.toLocaleString('ar-EG')}</b><small>موضعًا</small></span>
              <span><b>{kinds.toLocaleString('ar-EG')}</b><small>أنواع جغرافية</small></span>
              <span><b>{businesses.length.toLocaleString('ar-EG')}</b><small>سجلًا خدميًا</small></span>
            </div>
          </aside>
        </div>
      </section>
      <section id="places" className="shell page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">دليل القرى حسب المكان</span>
            <h2>افتح دليل كل قرية ونجع في مركز نقادة</h2>
            <p>من دليل بشلاو ودليل الأوسط قمولا إلى طوخ والخطارة ودنفيق وبقية المواضع، كل بطاقة تقود إلى صفحة محلية مستقلة تربط المكان بالخدمات والأنشطة المنشورة داخله.</p>
          </div>
        </div>
        <LocalityExplorer localities={localities} />
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
