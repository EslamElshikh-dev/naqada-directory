import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KnowledgeSectionNav } from '@/components/knowledge-section-nav';
import { RelatedKnowledge } from '@/components/related-knowledge';
import { getKnowledgePerson, knowledgeAttribution, knowledgePeople, sourceById } from '@/lib/knowledge';
import styles from '../../knowledge.module.css';
import v3Styles from '../../knowledge-v3.module.css';

type Props={params:Promise<{slug:string}>};
export function generateStaticParams(){return knowledgePeople.map((item)=>({slug:item.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const person=getKnowledgePerson(slug);if(!person)return{};return{title:`${person.name} — أعلام نقادة`,description:`سجل ${person.name} كما ورد في المصدر المرجعي لموسوعة دليل نقادة.`,alternates:{canonical:`/knowledge/people/${person.slug}`}};}

export default async function PersonPage({params}:Props){
  const {slug}=await params;
  const person=getKnowledgePerson(slug);
  if(!person)notFound();
  const source=sourceById(person.sourceId);

  return <main id="main-content" className="page-main">
    <div className={`shell ${v3Styles.navWrap}`}><KnowledgeSectionNav current="people" /></div>
    <div className={`shell ${styles.wrap} ${styles.detail}`}>
      <Link className={styles.back} href="/knowledge/people">← أعلام نقادة</Link>
      <article className={styles.detailCard}>
        <span className={styles.eyebrow}>{person.group} · مؤكد من المصدر</span>
        <h1>{person.name}</h1>
        <p>هذا السجل يثبت ورود الاسم والتصنيفات المرفقة في المصدر. لا تُستنتج منه صلة عائلية أو نسب أو سيرة موسعة إلا بمصدر صريح إضافي.</p>
        <div className={styles.tags}>{person.professionTags.map((tag)=><span className={styles.tag} key={tag}>{tag}</span>)}{person.placeTags.map((tag)=><span className={styles.tag} key={tag}>{tag}</span>)}</div>
        <div className={styles.sourceBox}><strong>الإسناد</strong><p>{knowledgeAttribution(person.contributorId)}</p><small>المصدر: {source?.title || 'مصدر موسوعة نقادة'}{source?.year ? ` · ${source.year}` : ''}</small></div>
        <RelatedKnowledge kind="person" item={person} />
      </article>
    </div>
  </main>;
}
