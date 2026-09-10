import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MemberAvatar } from '@/components/auth/member-avatar';
import { KnowledgeSectionNav } from '@/components/knowledge-section-nav';
import { fieldInformants, getKnowledgeContributor, knowledgeHeritage, knowledgePeople, knowledgePlaces, knowledgeReferences, knowledgeSources } from '@/lib/knowledge';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import styles from '../../knowledge/knowledge.module.css';
import v3Styles from '../../knowledge/knowledge-v3.module.css';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return [{ slug: 'ahmed-aldaabasi' }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getKnowledgeContributor(slug);
  if (!c) return {};
  return { title: `${c.name} — ${c.role}`, description: `${c.name}، مؤلف «${c.primaryWork}» و${c.role} في دليل نقادة.`, alternates: { canonical: `/contributors/${c.slug}` } };
}

export default async function ContributorPage({ params }: Props) {
  const { slug } = await params;
  const c = getKnowledgeContributor(slug);
  if (!c) notFound();
  const canonical = `${siteConfig.url}/contributors/${c.slug}`;
  const structured = { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: c.name, honorificPrefix: c.honorific, description: `مؤلف «${c.primaryWork}» و${c.role} في دليل نقادة.`, url: canonical, knowsAbout: ['تاريخ نقادة', 'تراث نقادة', 'جغرافية مركز نقادة'] } };

  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className={`shell ${styles.contributorHero}`}><MemberAvatar name={c.name} frame="gold" size={116} badge={c.role} priority /><div><span className={styles.eyebrow}>ملف مساهم موثق</span><h1>{c.honorific} <em>{c.name}</em></h1><div className={styles.badges}>{c.badges.map((badge) => <span className={styles.badge} key={badge}>{badge}</span>)}</div><p>مؤلف «{c.primaryWork}» و{c.role} في دليل نقادة. تُنسب إليه المواد المستخرجة من كتابه ومصادره وفق سياسة الإسناد المعتمدة.</p></div></div></section>
    <div className={`shell ${v3Styles.navWrap}`}><KnowledgeSectionNav current="contributor" /></div>
    <div className={`shell ${styles.wrap}`}>
      <section className={styles.grid}>
        <article className={styles.card}><span className={styles.cardBadge}>المؤلَّف الأساسي</span><h2>{c.primaryWork}</h2><p>المصدر المرجعي الأساسي للطبقة الجديدة من المكان والأعلام والتراث والمراجع.</p><Link href="/knowledge">فتح الموسوعة ←</Link></article>
        <article className={styles.card}><span className={styles.cardBadge}>الأثر داخل الدليل</span><h2>{knowledgePlaces.length.toLocaleString('ar-EG')} موضعًا</h2><p>{knowledgePeople.length.toLocaleString('ar-EG')} شخصية · {knowledgeHeritage.length.toLocaleString('ar-EG')} موضوعًا تراثيًا · {knowledgeReferences.length.toLocaleString('ar-EG')} مرجعًا.</p><Link href="/knowledge/places">استكشف البيانات ←</Link></article>
        <article className={styles.card}><span className={styles.cardBadge}>العمل الميداني</span><h2>{fieldInformants.length.toLocaleString('ar-EG')} اسمًا</h2><p>أسماء ونطاقات جغرافية وردت ضمن المقابلات والمساعدة الميدانية في المصدر.</p><Link href="/knowledge/fieldwork">عرض القائمة ←</Link></article>
      </section>
      <section className={styles.section}><div className={styles.sectionHeader}><div><span>المصادر المنسوبة</span><h2>المواد المرجعية المرتبطة</h2></div></div><div className={styles.grid}>{knowledgeSources.map((source) => <article className={styles.card} key={source.id}><span className={styles.cardBadge}>{source.kind}</span><h3>{source.title}</h3><p>{source.year ? `${source.year} · ` : ''}{source.usage.replaceAll('_', ' ')}</p></article>)}</div></section>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structured) }} />
  </main>;
}
