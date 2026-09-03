import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { BrandMark } from '@/components/site-shell';
import { businesses, categories, directoryBusinesses, localities } from '@/lib/data';

export const metadata: Metadata = {
  title: 'دليل الخدمات والأنشطة في نقادة',
  description: 'ابحث وصَفِّ الأنشطة والخدمات المنشورة في مدينة نقادة وقراها ونجوعها بحسب الاسم والتصنيف والمكان.',
  alternates: { canonical: '/directory' },
};

export default function DirectoryPage() {
  const mapped = businesses.filter((item) => item.mapsUrl).length;
  const phoned = businesses.filter((item) => item.phone).length;
  return (
    <main id="main-content" className="page-main">
      <section className="catalog-hero">
        <div className="shell catalog-hero__grid">
          <div><nav className="breadcrumbs"><span>الرئيسية</span><span>/</span><span>الدليل</span></nav><span className="eyebrow">دليل الخدمات والأنشطة</span><h1>كل خدمات نقادة في <em>بحث واحد</em></h1><p>اكتب اسم المكان أو الخدمة، ثم ضيّق النتائج حسب القرية أو القسم. كل بطاقة تفتح صفحة تفصيلية مستقلة.</p></div>
          <aside className="catalog-hero__summary"><span className="catalog-hero__mark"><BrandMark /></span><div className="catalog-hero__metrics"><span><b>{businesses.length.toLocaleString('ar-EG')}</b><small>سجلًا منشورًا</small></span><span><b>{categories.length.toLocaleString('ar-EG')}</b><small>قسمًا</small></span><span><b>{mapped.toLocaleString('ar-EG')}</b><small>رابط خريطة</small></span><span><b>{phoned.toLocaleString('ar-EG')}</b><small>رقم اتصال</small></span></div></aside>
        </div>
      </section>
      <section className="shell page-section">
        <Suspense fallback={<div className="loading-state">جارٍ تجهيز الدليل…</div>}>
          <DirectoryExplorer businesses={directoryBusinesses} categories={categories} localities={localities} />
        </Suspense>
      </section>
    </main>
  );
}
