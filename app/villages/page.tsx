import type { Metadata } from 'next';
import Link from 'next/link';
import { LocalityExplorer } from '@/components/locality-explorer';
import { BrandMark } from '@/components/site-shell';
import { businesses, officialLocalities } from '@/lib/data';
import { jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'قرى ونجوع مركز نقادة',
  description: 'استكشف القرى والنجوع والعزب والمواضع الموثقة داخل مركز نقادة وافتح صفحة مستقلة للخدمات المسجلة في كل موضع.',
  alternates: { canonical: '/villages' },
};

export default function VillagesPage() {
  const kinds = new Set(officialLocalities.map((item) => item.type)).size;
  const structuredData = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'قرى ونجوع مركز نقادة', url: `${siteConfig.url}/villages`, mainEntity: { '@type': 'ItemList', numberOfItems: officialLocalities.length, itemListElement: officialLocalities.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: `${siteConfig.url}/villages/${encodeURIComponent(item.slug)}` })) } };
  return (
    <main id="main-content" className="page-main">
      <section className="geo-hero"><div className="shell geo-hero__grid"><div><nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>القرى والنجوع</span></nav><span className="eyebrow">الجغرافيا المحلية</span><h1>قرى ونجوع <em>مركز نقادة</em></h1><p>تصفّح الهيكل الجغرافي الموثق، ثم انتقل إلى الخدمات المنشورة في كل مدينة أو قرية أو نجع أو عزبة.</p><a href="#places" className="button button--light">استكشف المواضع</a></div><aside className="geo-hero__panel"><BrandMark /><strong>مركز نقادة · قنا</strong><p>صفحات مستقلة تحافظ على اسم الموضع ونوعه ونطاقه كما ورد في المصدر.</p><div className="catalog-hero__metrics"><span><b>{officialLocalities.length.toLocaleString('ar-EG')}</b><small>موضعًا</small></span><span><b>{kinds.toLocaleString('ar-EG')}</b><small>أنواع جغرافية</small></span><span><b>{businesses.length.toLocaleString('ar-EG')}</b><small>سجلًا خدميًا</small></span></div></aside></div></section>
      <section id="places" className="shell page-section"><div className="section-heading"><div><span className="eyebrow eyebrow--dark">استكشف حسب المكان</span><h2>صفحة مستقلة لكل موضع</h2><p>عدد الخدمات يعكس السجلات المنشورة حاليًا، لا إجمالي الأنشطة الواقعية.</p></div></div><LocalityExplorer localities={officialLocalities} /></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
