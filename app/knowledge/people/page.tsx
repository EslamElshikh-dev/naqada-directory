import type { Metadata } from 'next';
import Link from 'next/link';
import { KnowledgeSectionNav } from '@/components/knowledge-section-nav';
import { knowledgePeople, primaryKnowledgeContributor } from '@/lib/knowledge';
import styles from '../knowledge.module.css';
import v3Styles from '../knowledge-v3.module.css';

export const metadata: Metadata = { title: 'أعلام نقادة — الموسوعة', description: 'سجل الأعلام والشخصيات الواردة في مصادر موسوعة نقادة، بوسوم المجال والمكان وإسناد واضح.', alternates: { canonical: '/knowledge/people' } };

export default function KnowledgePeoplePage() {
  const groups = [...new Set(knowledgePeople.map((item) => item.group))].map((group) => ({
    name: group,
    people: knowledgePeople.filter((item) => item.group === group),
  }));

  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className={`shell ${styles.heroGrid}`}><div><span className={styles.eyebrow}>أعلام وشخصيات</span><h1>وجوه من <em>ذاكرة نقادة</em></h1><p>{knowledgePeople.length.toLocaleString('ar-EG')} سجلًا مستخرجًا من المصدر، مع منع استنتاج النسب أو العلاقات من تشابه الأسماء.</p></div><aside className={styles.stats}><span><b>{knowledgePeople.length.toLocaleString('ar-EG')}</b><small>شخصية</small></span><span><b>{groups.length.toLocaleString('ar-EG')}</b><small>مجموعة</small></span></aside></div></section>
    <div className={`shell ${v3Styles.navWrap}`}><KnowledgeSectionNav current="people" /></div>
    <div className={`shell ${styles.wrap}`}>
      <Link className={styles.back} href="/knowledge">← موسوعة نقادة</Link>
      <section className={styles.attribution}><div className={styles.seal}>أد</div><div><h2>إسناد السجل</h2><p>{primaryKnowledgeContributor.attributionFull}</p></div></section>
      <nav className={v3Styles.jumpRail} aria-label="مجموعات الأعلام">{groups.map((group, index) => <a key={group.name} href={`#people-group-${index + 1}`}><span>{group.name}</span><small>{group.people.length.toLocaleString('ar-EG')}</small></a>)}</nav>
      {groups.map((group, index) => <section className={v3Styles.groupSection} id={`people-group-${index + 1}`} key={group.name}><div className={v3Styles.groupHeader}><div><span>مجموعة من السجل المرجعي</span><h2>{group.name}</h2></div><div className={v3Styles.groupCount}>{group.people.length.toLocaleString('ar-EG')} اسمًا</div></div><div className={styles.grid}>{group.people.map((person) => <article className={styles.card} key={person.id}><div className={styles.cardTop}><span className={styles.cardBadge}>{person.group}</span></div><h2>{person.name}</h2><div className={styles.tags}>{person.professionTags.map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}{person.placeTags.map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}</div><Link href={`/knowledge/people/${encodeURIComponent(person.slug)}`}>عرض السجل ←</Link></article>)}</div></section>)}
    </div>
  </main>;
}
