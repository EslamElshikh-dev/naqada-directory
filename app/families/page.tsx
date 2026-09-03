import type { Metadata } from 'next';
import Link from 'next/link';
import { FamilyExplorer } from '@/components/family-explorer';
import { families } from '@/lib/data';

export const metadata: Metadata = {
  title: 'سجل عائلات نقادة الموثق',
  description: 'العائلة والموضع ودرجة الدليل وحدود كل ادعاء في السجل العائلي المنشور لمركز نقادة، دون وصل أنساب بالتشابه الاسمي.',
  alternates: { canonical: '/families' },
};

export default function FamiliesPage() {
  const localities = new Set(families.map((item) => item.locality)).size;
  const gradeA = families.filter((item) => item.grade === 'A').length;
  return (
    <main id="main-content" className="page-main">
      <section className="record-hero"><div className="shell record-hero__grid"><div><nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>العائلات</span></nav><span className="eyebrow">سجل عائلي منضبط</span><h1>العائلة والموضع والدليل… <em>من غير تخمين</em></h1><p>نعرض الحضور العائلي الذي وصل لمعيار النشر فقط، ونفصل بين العائلة الحالية والفرع التاريخي والإشارة الجزئية.</p></div><aside><span><b>{families.length.toLocaleString('ar-EG')}</b><small>سجلًا منشورًا</small></span><span><b>{localities.toLocaleString('ar-EG')}</b><small>موضعًا</small></span><span><b>{gradeA.toLocaleString('ar-EG')}</b><small>بدرجة A</small></span></aside></div></section>
      <section className="shell page-section">
        <div className="methodology-banner"><span>✓</span><div><strong>قاعدة الفصل أولًا</strong><p>تشابه اللقب بين موضعين لا يعني وحدة العائلة، واسم الديوان يثبت الحضور ولا يثبت شجرة نسب بعيدة.</p></div></div>
        <FamilyExplorer families={families} />
      </section>
    </main>
  );
}
