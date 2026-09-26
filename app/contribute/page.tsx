import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ContributionBuilder } from '@/components/contribution-builder';
import { OwnerBusinessForm } from '@/components/owner-business-form';
import { categories, localities } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'أضف نشاطك في دليل نقادة',
  description: 'سجّل نشاطك في نقادة باسم حسابك، أضف الرقم والمواعيد والعنوان والوصف والصور، وتابع حالته بعد المراجعة.',
  path: '/contribute',
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
});

type Props = { searchParams: Promise<{ type?: string; edit?: string; name?: string; category?: string; locality?: string }> };

export default async function ContributePage({ searchParams }: Props) {
  const query = await searchParams;
  const correction = query.type === 'correction' || query.type === 'missing';
  const pageUrl = `${siteConfig.url}/contribute`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'أضف نشاطك في دليل نقادة',
    url: pageUrl,
    description: 'إضافة نشاط محلي وربطه بحساب صاحبه، مع إتاحة طلبات التصحيح.',
    isPartOf: { '@id': `${siteConfig.url}#website` },
  };

  return (
    <main id="main-content" className="page-main">
      <section className="about-hero">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><span>المساهمة في الدليل</span></nav>
          <span className="eyebrow">مكانك معروف عند أهل البلد</span>
          <h1>{correction ? <>صحّح معلومة <em>في الدليل</em></> : <>أضف نشاطك <em>باسمك</em></>}</h1>
          <p>{correction ? 'لقيت عنوانًا أو رقمًا يحتاج تعديل؟ ابعت لنا التفاصيل عشان نراجعها.' : 'عندك نشاط في نقادة أو قراها؟ سجّله بحسابك، وحط رقمك ومواعيدك وعنوانك وصور حقيقية من المكان.'}</p>
        </div>
      </section>
      <section className="shell page-section">
        {correction ? <Suspense fallback={<div className="loading-state">جارٍ تجهيز نموذج التصحيح…</div>}><ContributionBuilder categories={categories} localities={localities.filter((item) => item.businessCount > 0 || item.verification)} /></Suspense> :
          <OwnerBusinessForm
            key={query.edit || 'new'}
            categories={categories} localities={localities}
            editId={query.edit || ''}
            initialName={query.name || ''}
            initialCategory={query.category || ''}
            initialLocality={query.locality || ''}
          />}
        <p style={{ marginTop: 18, color: 'var(--muted)', fontSize: 14, lineHeight: 1.9 }}>
          {correction ? <>عايز تضيف نشاطك ويكون باسم حسابك؟ <Link href="/contribute" className="text-link">ابدأ إضافة نشاطك ←</Link></> : <>عندك تصحيح لنشاط منشور؟ <Link href="/contribute?type=correction" className="text-link">ابعت طلب تصحيح ←</Link></>} · التفاصيل في <Link href="/privacy" className="text-link">سياسة الخصوصية</Link>.
        </p>
      </section>
      <section className="section section--muted"><div className="shell methodology"><div><span className="eyebrow eyebrow--dark">سياسة المراجعة</span><h2>النشاط باسم صاحبه، والنشر بعد المراجعة</h2><p>من حسابك تقدر ترجع لبيانات نشاطك وتعدّلها. أي إضافة أو تعديل ينتظر مراجعة الإدارة قبل ما يظهر للعامة.</p><Link href="/about" className="text-link">اقرأ منهج البيانات ←</Link></div><div className="methodology__grid"><article><b>01</b><h3>سجّل بياناتك</h3><p>اسم النشاط ورقم الجوال والمكان والمواعيد والوصف.</p></article><article><b>02</b><h3>أضف صورًا حقيقية</h3><p>صور من المكان أو الخدمة تساعد الناس تتعرف عليه.</p></article><article><b>03</b><h3>تابع نشاطك</h3><p>مملوك لحسابك، وبعد المراجعة تظهر له صفحة في الدليل.</p></article></div></div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
