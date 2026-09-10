import type { Metadata } from 'next';
import Link from 'next/link';
import { KnowledgeSectionNav } from '@/components/knowledge-section-nav';
import { fieldInformants, primaryKnowledgeContributor } from '@/lib/knowledge';
import styles from '../knowledge.module.css';
import v3Styles from '../knowledge-v3.module.css';

export const metadata: Metadata = { title: 'العمل الميداني — موسوعة نقادة', description: 'الأسماء والنطاقات المكانية التي أوردها مؤلف إقليم نقادة بصعيد مصر ضمن المقابلات والمساعدة الميدانية.', alternates: { canonical: '/knowledge/fieldwork' } };

export default function FieldworkPage() {
  const scopeCounts = [...new Set(fieldInformants.map((item) => item.locationScope))]
    .map((scope) => ({ scope, count: fieldInformants.filter((item) => item.locationScope === scope).length }))
    .sort((a, b) => b.count - a.count);

  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className={`shell ${styles.heroGrid}`}><div><span className={styles.eyebrow}>توثيق العمل الميداني</span><h1>أهل المكان <em>داخل المصدر</em></h1><p>{fieldInformants.length.toLocaleString('ar-EG')} اسمًا وردت في قائمة المقابلات أو المساعدة الميدانية مع نطاقها الجغرافي، دون نشر هواتف أو بيانات اتصال.</p></div><aside className={styles.stats}><span><b>{fieldInformants.length.toLocaleString('ar-EG')}</b><small>اسمًا</small></span><span><b>{scopeCounts.length.toLocaleString('ar-EG')}</b><small>نطاقًا جغرافيًا</small></span></aside></div></section>
    <div className={`shell ${v3Styles.navWrap}`}><KnowledgeSectionNav current="fieldwork" /></div>
    <div className={`shell ${styles.wrap}`}>
      <Link className={styles.back} href="/knowledge">← موسوعة نقادة</Link>
      <section className={styles.attribution}><div className={styles.seal}>أد</div><div><h2>نسبة القائمة</h2><p>وردت هذه الأسماء في المادة التي جمعها {primaryKnowledgeContributor.name} ضمن عمل الكتاب ومصادره الميدانية.</p></div></section>
      <div className={v3Styles.summaryRail} aria-label="أبرز نطاقات العمل الميداني">{scopeCounts.slice(0, 12).map((item) => <span key={item.scope}>{item.scope}<b>{item.count.toLocaleString('ar-EG')}</b></span>)}</div>
      <div className={styles.list}>{fieldInformants.map((item) => <article className={styles.row} key={item.id}><div><strong>{item.name}</strong><small>مقابلة أو مساعدة ميدانية كما صنفها سجل الاستخراج</small></div><small>{item.locationScope}</small><span className={styles.cardBadge}>موثق من المصدر</span></article>)}</div>
    </div>
  </main>;
}
