import type { Metadata } from 'next';
import Link from 'next/link';
import { HeritageExplorer } from '@/components/heritage-explorer';
import { landmarks, people } from '@/lib/data';

export const metadata: Metadata = {
  title: 'أعلام ومعالم نقادة',
  description: 'سجل موثق للأعلام والمعالم والتراث المحلي في مركز نقادة مع المصادر ودرجات الدليل وحدود كل معلومة.',
  alternates: { canonical: '/heritage' },
};

export default function HeritagePage() {
  return (
    <main id="main-content" className="page-main">
      <section className="record-hero record-hero--heritage"><div className="shell record-hero__grid"><div><nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>الأعلام والمعالم</span></nav><span className="eyebrow">ذاكرة المكان</span><h1>أعلام ومعالم تحكي <em>نقادة بمصادرها</em></h1><p>شخصيات عامة، مساجد، تعليم ومرافق وذاكرة محلية؛ مع فصل واضح بين المعلومة المنشورة والاستنتاج غير المسموح.</p></div><aside><span><b>{landmarks.length.toLocaleString('ar-EG')}</b><small>معلمًا</small></span><span><b>{people.length.toLocaleString('ar-EG')}</b><small>شخصيات</small></span><span><b>{(landmarks.length + people.length).toLocaleString('ar-EG')}</b><small>سجلًا موثقًا</small></span></aside></div></section>
      <section className="shell page-section">
        <div className="methodology-banner methodology-banner--gold"><span>i</span><div><strong>التغطية تتوسع على مراحل</strong><p>غياب قرية من السجل لا يعني أنها بلا أعلام أو معالم؛ تُضاف المواد بعد إغلاق بحثها بالمستوى نفسه.</p></div></div>
        <HeritageExplorer landmarks={landmarks} people={people} />
      </section>
    </main>
  );
}
