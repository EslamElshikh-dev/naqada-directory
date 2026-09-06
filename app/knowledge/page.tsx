import type { Metadata } from 'next';
import Link from 'next/link';
import { fieldInformants, knowledgeHeritage, knowledgePeople, knowledgePlaces, knowledgeReferences, knowledgeSources, knowledgeSummary, primaryKnowledgeContributor } from '@/lib/knowledge';
import styles from './knowledge.module.css';

export const metadata: Metadata = {
  title: 'موسوعة نقادة — المكان والناس والتراث بالمصادر',
  description: 'قاعدة معرفة منظمة لمركز نقادة: القرى والنجوع، الأعلام، التراث، المراجع والعمل الميداني مع إسناد واضح للمؤلف والمصادر.',
  alternates: { canonical: '/knowledge' },
};

const sections = [
  { href: '/knowledge/places', title: 'خريطة المكان', count: knowledgePlaces.length, text: 'قرى ونجوع وعزب وحواجر وعلاقات تبعية وأسماء تاريخية، مع فصل البيانات التاريخية عن الوضع المعاصر.' },
  { href: '/knowledge/people', title: 'أعلام نقادة', count: knowledgePeople.length, text: 'شخصيات وردت في المصدر، مصنفة بوسوم المجال والمكان دون اختلاق صلات عائلية غير مثبتة.' },
  { href: '/knowledge/heritage', title: 'التراث والمعالم', count: knowledgeHeritage.length, text: 'آثار وتراث ومواقع وموضوعات سياحية وحرفية جاهزة للتوسع التحريري المنسوب للمصدر.' },
  { href: '/knowledge/references', title: 'المراجع', count: knowledgeReferences.length, text: 'الفهرس المرجعي الذي استند إليه المؤلف، محفوظ كطبقة مستقلة لتتبع أصل المعرفة.' },
  { href: '/knowledge/fieldwork', title: 'العمل الميداني', count: fieldInformants.length, text: 'الأسماء والنطاقات الجغرافية التي أوردها المؤلف ضمن المقابلات أو المساعدة الميدانية، بلا بيانات اتصال.' },
  { href: '/contributors/ahmed-aldaabasi', title: 'المؤلف والمساهم', count: knowledgeSources.length, text: 'ملف الأستاذ أحمد الدعباسي، مؤلف «إقليم نقادة بصعيد مصر» ومشرف ومساهم ذهبي في دليل نقادة.' },
];

export default function KnowledgePage() {
  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className={`shell ${styles.heroGrid}`}>
      <div><span className={styles.eyebrow}>قاعدة المعرفة المرجعية لدليل نقادة</span><h1>موسوعة نقادة <em>بالمصدر والإسناد</em></h1><p>طبقة معرفية تجمع المكان والناس والتراث والمراجع في بنية قابلة للتتبع. لا نخلط بين ما ورد في المصدر وبين التحقق الحديث، ولا ننشر النص الخام للكتاب حرفيًا.</p></div>
      <aside className={styles.stats}><span><b>{knowledgeSummary.counts.places.toLocaleString('ar-EG')}</b><small>مكانًا</small></span><span><b>{knowledgeSummary.counts.people.toLocaleString('ar-EG')}</b><small>شخصية</small></span><span><b>{knowledgeSummary.counts.heritage.toLocaleString('ar-EG')}</b><small>موضوعًا تراثيًا</small></span><span><b>{knowledgeSummary.counts.references.toLocaleString('ar-EG')}</b><small>مرجعًا</small></span></aside>
    </div></section>
    <div className={`shell ${styles.wrap}`}>
      <section className={styles.attribution}><div className={styles.seal}>أد</div><div><h2>إسناد أصيل داخل كل سجل</h2><p>{primaryKnowledgeContributor.attributionFull}. <Link href={`/contributors/${primaryKnowledgeContributor.slug}`}>عرض ملف المؤلف والمساهم ←</Link></p></div></section>
      <section className={styles.grid}>{sections.map((item) => <article className={styles.card} key={item.href}><div className={styles.cardTop}><span className={styles.cardBadge}>{item.count.toLocaleString('ar-EG')} سجل</span></div><h2>{item.title}</h2><p>{item.text}</p><Link href={item.href}>استكشف القسم ←</Link></article>)}</section>
      <section className={styles.section}><div className={styles.sectionHeader}><div><span>منهج النشر</span><h2>المعلومة لا تنفصل عن أصلها</h2></div></div><div className={styles.grid}>
        <article className={styles.card}><span className={styles.cardBadge}>01</span><h3>مصدر محدد</h3><p>كل سجل يحمل معرف المصدر والمؤلف، مع إبقاء المادة الأصلية خارج المستودع العام عندما تكون محمية بحقوق نشر.</p></article>
        <article className={styles.card}><span className={styles.cardBadge}>02</span><h3>حالة تحقق واضحة</h3><p>«مؤكد من المصدر» تعني أن المعلومة وردت في المرجع، ولا تعني تلقائيًا أنها تحقق حديث مستقل لعام 2026.</p></article>
        <article className={styles.card}><span className={styles.cardBadge}>03</span><h3>ربط بالدليل الحي</h3><p>حين يطابق الموضع صفحة قرية أو نشاطًا حديثًا، نربط المعرفة التاريخية بالدليل التجاري مع الحفاظ على الفصل بين الطبقتين.</p></article>
      </div></section>
    </div>
  </main>;
}