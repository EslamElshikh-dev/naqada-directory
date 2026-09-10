import type { Metadata } from 'next';
import Link from 'next/link';
import { KnowledgeSectionNav } from '@/components/knowledge-section-nav';
import { knowledgeHeritage, primaryKnowledgeContributor } from '@/lib/knowledge';
import styles from '../knowledge.module.css';
import v3Styles from '../knowledge-v3.module.css';

export const metadata: Metadata = { title: 'تراث ومعالم نقادة — الموسوعة', description: 'المواقع والموضوعات التراثية والسياحية الواردة في مصادر موسوعة نقادة مع الإسناد للمؤلف.', alternates: { canonical: '/knowledge/heritage' } };

export default function HeritagePage() {
  const groups = [...new Set(knowledgeHeritage.map((item) => item.category))].map((category) => ({
    name: category,
    items: knowledgeHeritage.filter((item) => item.category === category),
  }));

  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className={`shell ${styles.heroGrid}`}><div><span className={styles.eyebrow}>التراث والمعالم</span><h1>نقادة التي <em>تحكي نفسها</em></h1><p>{knowledgeHeritage.length.toLocaleString('ar-EG')} موضوعًا موزعًا على {groups.length.toLocaleString('ar-EG')} محاور تراثية وسياحية.</p></div><aside className={styles.stats}><span><b>{knowledgeHeritage.length.toLocaleString('ar-EG')}</b><small>موضوعًا</small></span><span><b>{groups.length.toLocaleString('ar-EG')}</b><small>محورًا</small></span></aside></div></section>
    <div className={`shell ${v3Styles.navWrap}`}><KnowledgeSectionNav current="heritage" /></div>
    <div className={`shell ${styles.wrap}`}>
      <Link className={styles.back} href="/knowledge">← موسوعة نقادة</Link>
      <section className={styles.attribution}><div className={styles.seal}>أد</div><div><h2>المؤلف والمصدر</h2><p>{primaryKnowledgeContributor.attributionFull}</p></div></section>
      <nav className={v3Styles.jumpRail} aria-label="محاور التراث">{groups.map((group, index) => <a key={group.name} href={`#heritage-group-${index + 1}`}><span>{group.name}</span><small>{group.items.length.toLocaleString('ar-EG')}</small></a>)}</nav>
      {groups.map((group, index) => <section className={v3Styles.groupSection} id={`heritage-group-${index + 1}`} key={group.name}><div className={v3Styles.groupHeader}><div><span>محور من المادة المرجعية</span><h2>{group.name}</h2></div><div className={v3Styles.groupCount}>{group.items.length.toLocaleString('ar-EG')} موضوعًا</div></div><div className={styles.grid}>{group.items.map((item) => <article className={styles.card} key={item.id}><div className={styles.cardTop}><span className={styles.cardBadge}>{item.category}</span><small>#{item.order.toLocaleString('ar-EG')}</small></div><h2>{item.name}</h2><p>مدخل موثق من المصدر؛ السرد الموسع يعاد تحريره قبل النشر ولا يُنسخ من الكتاب حرفيًا.</p><Link href={`/knowledge/heritage/${encodeURIComponent(item.slug)}`}>عرض المدخل ←</Link></article>)}</div></section>)}
    </div>
  </main>;
}
