import type { Metadata } from 'next';
import Link from 'next/link';
import { KnowledgeSectionNav } from '@/components/knowledge-section-nav';
import { localities } from '@/lib/data';
import { knowledgeAliases, knowledgePlaces, primaryKnowledgeContributor } from '@/lib/knowledge';
import styles from '../knowledge.module.css';
import v3Styles from '../knowledge-v3.module.css';

export const metadata: Metadata = { title: 'قرى ونجوع نقادة — الموسوعة', description: 'سجل الأماكن في مركز نقادة كما ورد في المصادر، مع التبعية والأسماء التاريخية وبيانات التعداد التاريخية عند توفرها.', alternates: { canonical: '/knowledge/places' } };

export default function KnowledgePlacesPage() {
  const typeCounts = [...new Set(knowledgePlaces.map((item) => item.type))]
    .map((type) => ({ type, count: knowledgePlaces.filter((item) => item.type === type).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return <main id="main-content" className="page-main">
    <section className={styles.hero}><div className={`shell ${styles.heroGrid}`}><div><span className={styles.eyebrow}>خريطة المكان</span><h1>قرى ونجوع <em>نقادة</em></h1><p>سجل مكاني مرجعي يضم {knowledgePlaces.length.toLocaleString('ar-EG')} موضعًا، مع روابط للصفحات التجارية الحديثة عندما يتوفر تطابق واضح.</p></div><aside className={styles.stats}><span><b>{knowledgePlaces.length.toLocaleString('ar-EG')}</b><small>مكانًا</small></span><span><b>{knowledgeAliases.length.toLocaleString('ar-EG')}</b><small>اسمًا بديلًا</small></span></aside></div></section>
    <div className={`shell ${v3Styles.navWrap}`}><KnowledgeSectionNav current="places" /></div>
    <div className={`shell ${styles.wrap}`}>
      <Link className={styles.back} href="/knowledge">← موسوعة نقادة</Link>
      <section className={styles.attribution}><div className={styles.seal}>أد</div><div><h2>المصدر والمؤلف</h2><p>{primaryKnowledgeContributor.attributionFull}</p></div></section>
      <div className={v3Styles.summaryRail} aria-label="أنواع المواضع الأكثر حضورًا">{typeCounts.map((item) => <span key={item.type}>{item.type}<b>{item.count.toLocaleString('ar-EG')}</b></span>)}</div>
      <div className={styles.list}>{knowledgePlaces.map((place) => { const live = localities.find((item) => item.name === place.name || item.name === place.shortName); return <article className={styles.row} key={place.id}><div><strong>{place.name}</strong><small>{place.type} · يتبع: {place.parent}</small></div><small>{place.population2014 ? `تعداد مذكور 2014: ${place.population2014.toLocaleString('ar-EG')}` : 'بيانات مكانية موثقة من المصدر'}</small><div><Link href={`/knowledge/places/${encodeURIComponent(place.slug)}`}>التفاصيل</Link>{live ? <> · <Link href={`/villages/${encodeURIComponent(live.slug)}`}>الدليل الحالي</Link></> : null}</div></article>; })}</div>
    </div>
  </main>;
}
