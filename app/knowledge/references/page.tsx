import '@/app/content-styles.css';
import { NUMBER_LOCALE } from '@/lib/format-number';
import { buildPageMetadata } from '@/lib/site';
import Link from 'next/link';
import { KnowledgeSectionNav } from '@/components/knowledge-section-nav';
import { knowledgeReferences, primaryKnowledgeContributor } from '@/lib/knowledge';
import styles from '../knowledge.module.css';
import v3Styles from '../knowledge-v3.module.css';

export const metadata = buildPageMetadata({ title: 'مراجع موسوعة نقادة', description: 'قائمة المراجع التي أوردها مؤلف إقليم نقادة بصعيد مصر، مع حفظها كطبقة مصدر مستقلة.', path: '/knowledge/references' });

export default function ReferencesPage() {
  const groups = [...new Set(knowledgeReferences.map((item) => item.group))].map((group) => ({
    name: group,
    items: knowledgeReferences.filter((item) => item.group === group),
  }));

  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className={`shell ${styles.heroGrid}`}><div><span className={styles.eyebrow}>الفهرس المرجعي</span><h1>{knowledgeReferences.length.toLocaleString(NUMBER_LOCALE)} مرجعًا <em>وراء المعرفة</em></h1><p>قائمة ببليوغرافية كما أوردها المؤلف، تحفظ طريق العودة إلى المراجع بدل أن تصبح المعلومة بلا أصل.</p></div><aside className={styles.stats}><span><b>{knowledgeReferences.length.toLocaleString(NUMBER_LOCALE)}</b><small>مرجعًا</small></span><span><b>{groups.length.toLocaleString(NUMBER_LOCALE)}</b><small>مجموعة</small></span></aside></div></section>
    <div className={`shell ${v3Styles.navWrap}`}><KnowledgeSectionNav current="references" /></div>
    <div className={`shell ${styles.wrap}`}>
      <Link className={styles.back} href="/knowledge">← موسوعة نقادة</Link>
      <section className={styles.attribution}><div className={styles.seal}>أد</div><div><h2>مصدر قائمة المراجع</h2><p>{primaryKnowledgeContributor.attributionFull}</p></div></section>
      <nav className={v3Styles.jumpRail} aria-label="مجموعات المراجع">{groups.map((group, index) => <a key={group.name} href={`#references-group-${index + 1}`}><span>{group.name}</span><small>{group.items.length.toLocaleString(NUMBER_LOCALE)}</small></a>)}</nav>
      {groups.map((group, index) => <section className={`${styles.section} ${v3Styles.groupSection}`} id={`references-group-${index + 1}`} key={group.name}><div className={v3Styles.groupHeader}><div><span>مجموعة مراجع</span><h2>{group.name}</h2></div><div className={v3Styles.groupCount}>{group.items.length.toLocaleString(NUMBER_LOCALE)} مرجعًا</div></div><div className={styles.list}>{group.items.map((item) => <article className={styles.reference} key={item.id}><b>{item.id.replace('ref-', 'مرجع ')}</b>{item.text}</article>)}</div></section>)}
    </div>
  </main>;
}
