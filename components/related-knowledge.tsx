import Link from 'next/link';
import { localities } from '@/lib/data';
import {
  knowledgeHeritage,
  knowledgePeople,
  knowledgePeopleForLocality,
  knowledgePlaceForLocality,
  knowledgePlaces,
  type KnowledgeHeritage,
  type KnowledgePerson,
  type KnowledgePlace,
} from '@/lib/knowledge';
import styles from './related-knowledge.module.css';

type Props =
  | { kind: 'person'; item: KnowledgePerson }
  | { kind: 'place'; item: KnowledgePlace }
  | { kind: 'heritage'; item: KnowledgeHeritage };

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[()،,.\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(مدينه|قريه|نجع|عزبه|حاجر|جزيره)\s+/, '');
}

function liveLocalityFor(place: KnowledgePlace) {
  const wanted = new Set([place.name, place.shortName].filter(Boolean).map(normalize));
  return localities.find((locality) => wanted.has(normalize(locality.name)));
}

function PersonRelated({ item }: { item: KnowledgePerson }) {
  const places = item.placeTags
    .map((tag) => knowledgePlaceForLocality(tag))
    .filter((place): place is KnowledgePlace => Boolean(place))
    .filter((place, index, all) => all.findIndex((candidate) => candidate.id === place.id) === index)
    .slice(0, 4);

  const relatedPeople = knowledgePeople
    .filter((person) => person.id !== item.id && person.group === item.group)
    .map((person) => {
      const sharedProfessions = person.professionTags.filter((tag) => item.professionTags.includes(tag)).length;
      const sharedPlaces = person.placeTags.filter((tag) => item.placeTags.some((current) => normalize(current) === normalize(tag))).length;
      return { person, score: sharedPlaces * 3 + sharedProfessions };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.person.number - b.person.number)
    .slice(0, 4);

  const live = places.map(liveLocalityFor).find(Boolean);
  if (!places.length && !relatedPeople.length && !live) return null;

  return <section className={styles.section} aria-labelledby="related-knowledge-heading">
    <div className={styles.heading}><div><span>استكشاف موثّق</span><h2 id="related-knowledge-heading">تابع داخل موسوعة نقادة</h2></div></div>
    <div className={styles.grid}>
      {places.map((place) => <Link className={styles.card} href={`/knowledge/places/${encodeURIComponent(place.slug)}`} key={place.id}><small>مكان مذكور في السجل</small><strong>{place.name}</strong><p>{place.type}{place.parent ? ` · يتبع ${place.parent}` : ''}</p></Link>)}
      {relatedPeople.map(({ person }) => <Link className={styles.card} href={`/knowledge/people/${encodeURIComponent(person.slug)}`} key={person.id}><small>تخصص أو مكان مشترك صريح</small><strong>{person.name}</strong><p>{person.professionTags.slice(0, 3).join(' · ') || person.group}</p></Link>)}
      {live ? <Link className={`${styles.card} ${styles.live}`} href={`/villages/${encodeURIComponent(live.slug)}`}><div><small>الطبقة الحديثة</small><strong>افتح دليل {live.name} الحالي</strong><p>الخدمات والأنشطة المنشورة حاليًا منفصلة عن المادة التاريخية المرجعية.</p></div><b>فتح الدليل ←</b></Link> : null}
    </div>
  </section>;
}

function PlaceRelated({ item }: { item: KnowledgePlace }) {
  const people = knowledgePeopleForLocality(item.name, 5);
  const siblings = item.parent
    ? knowledgePlaces.filter((place) => place.id !== item.id && place.parent === item.parent).slice(0, 5)
    : [];
  const live = liveLocalityFor(item);
  if (!people.length && !siblings.length && !live) return null;

  return <section className={styles.section} aria-labelledby="related-knowledge-heading">
    <div className={styles.heading}><div><span>سياق مكاني موثّق</span><h2 id="related-knowledge-heading">اكتشف ما يرتبط بهذا الموضع</h2></div></div>
    <div className={styles.grid}>
      {people.map((person) => <Link className={styles.card} href={`/knowledge/people/${encodeURIComponent(person.slug)}`} key={person.id}><small>شخصية موسومة بهذا المكان</small><strong>{person.name}</strong><p>{person.professionTags.slice(0, 3).join(' · ') || person.group}</p></Link>)}
      {siblings.map((place) => <Link className={styles.card} href={`/knowledge/places/${encodeURIComponent(place.slug)}`} key={place.id}><small>ضمن نفس التبعية المرجعية</small><strong>{place.name}</strong><p>{place.type}</p></Link>)}
      {live ? <Link className={`${styles.card} ${styles.live}`} href={`/villages/${encodeURIComponent(live.slug)}`}><div><small>الدليل الحي</small><strong>الخدمات والأنشطة في {live.name}</strong><p>انتقل من السجل المرجعي إلى صفحة المكان الحديثة دون خلط الطبقتين.</p></div><b>فتح الدليل ←</b></Link> : null}
    </div>
  </section>;
}

function HeritageRelated({ item }: { item: KnowledgeHeritage }) {
  const related = knowledgeHeritage
    .filter((entry) => entry.id !== item.id && entry.category === item.category)
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);

  if (!related.length) return null;
  return <section className={styles.section} aria-labelledby="related-knowledge-heading">
    <div className={styles.heading}><div><span>من نفس المحور</span><h2 id="related-knowledge-heading">موضوعات تراثية ذات صلة تصنيفية</h2></div></div>
    <div className={styles.grid}>
      {related.map((entry) => <Link className={styles.card} href={`/knowledge/heritage/${encodeURIComponent(entry.slug)}`} key={entry.id}><small>{entry.category}</small><strong>{entry.name}</strong><p>موضوع آخر ضمن نفس التصنيف المرجعي.</p></Link>)}
    </div>
  </section>;
}

export function RelatedKnowledge(props: Props) {
  if (props.kind === 'person') return <PersonRelated item={props.item} />;
  if (props.kind === 'place') return <PlaceRelated item={props.item} />;
  return <HeritageRelated item={props.item} />;
}
