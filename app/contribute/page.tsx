import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ContributionBuilder } from '@/components/contribution-builder';
import { categories, localities } from '@/lib/data';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'أضف نشاطًا أو صحح بيانات — دليل نقادة',
  description: 'ساهم في استكمال دليل نقادة بإضافة نشاط أو اقتراح تصحيح أو الإبلاغ عن نتيجة بحث مفقودة، مع طلب منظم ومصدر داعم.',
  alternates: { canonical: '/contribute' },
};

export default function ContributePage() {
  const pageUrl = `${siteConfig.url}/contribute`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'أضف نشاطًا أو صحح بيانات — دليل نقادة',
    url: pageUrl,
    description: 'صفحة المساهمة المجتمعية في استكمال وتصحيح بيانات دليل نقادة.',
    isPartOf: { '@id': `${siteConfig.url}#website` },
  };

  return (
    <main id="main-content" className="page-main">
      <section className="about-hero">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><span>المساهمة في الدليل</span></nav>
          <span className="eyebrow">دليل أدق بمشاركة أهل المكان</span>
          <h1>أضف نشاطًا أو <em>صحح معلومة</em></h1>
          <p>إذا لم تجد نشاطًا أو لاحظت عنوانًا أو رقمًا أو تصنيفًا يحتاج مراجعة، جهّز طلبًا واضحًا هنا. لا يُنشر أي تعديل تلقائيًا قبل المراجعة.</p>
        </div>
      </section>
      <section className="shell page-section">
        <Suspense fallback={<div className="loading-state">جارٍ تجهيز نموذج المساهمة…</div>}>
          <ContributionBuilder categories={categories} localities={localities.filter((item) => item.businessCount > 0 || item.verification)} />
        </Suspense>
      </section>
      <section className="section section--muted"><div className="shell methodology"><div><span className="eyebrow eyebrow--dark">سياسة المراجعة</span><h2>المساهمة ليست نشرًا تلقائيًا</h2><p>الطلب يمر بالمراجعة ومقارنة المصدر قبل تعديل السجل. الهدف أن تزيد التغطية من غير التضحية بدقة الدليل.</p><Link href="/about" className="text-link">اقرأ منهج البيانات ←</Link></div><div className="methodology__grid"><article><b>01</b><h3>حدد المعلومة</h3><p>اسم واضح، موضع، وتصنيف أو وصف للخطأ.</p></article><article><b>02</b><h3>أرفق مصدرًا</h3><p>خرائط Google أو موقع رسمي أو مصدر عام مباشر يسرّع المراجعة.</p></article><article><b>03</b><h3>مراجعة قبل النشر</h3><p>لا تُضاف أو تُعدل البيانات تلقائيًا بمجرد إرسال المقترح.</p></article></div></div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
