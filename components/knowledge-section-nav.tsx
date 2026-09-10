import Link from 'next/link';
import { fieldInformants, knowledgeSummary, primaryKnowledgeContributor } from '@/lib/knowledge';
import styles from './knowledge-section-nav.module.css';

type KnowledgeSection = 'overview' | 'places' | 'people' | 'heritage' | 'references' | 'fieldwork' | 'contributor';

type Props = {
  current: KnowledgeSection;
};

const items = [
  { key: 'overview', href: '/knowledge', label: 'الموسوعة', meta: 'الرئيسية' },
  { key: 'places', href: '/knowledge/places', label: 'الأماكن', meta: knowledgeSummary.counts.places.toLocaleString('ar-EG') },
  { key: 'people', href: '/knowledge/people', label: 'الأعلام', meta: knowledgeSummary.counts.people.toLocaleString('ar-EG') },
  { key: 'heritage', href: '/knowledge/heritage', label: 'التراث', meta: knowledgeSummary.counts.heritage.toLocaleString('ar-EG') },
  { key: 'references', href: '/knowledge/references', label: 'المراجع', meta: knowledgeSummary.counts.references.toLocaleString('ar-EG') },
  { key: 'fieldwork', href: '/knowledge/fieldwork', label: 'العمل الميداني', meta: fieldInformants.length.toLocaleString('ar-EG') },
  { key: 'contributor', href: `/contributors/${primaryKnowledgeContributor.slug}`, label: 'المساهم', meta: 'أد' },
] as const;

export function KnowledgeSectionNav({ current }: Props) {
  return (
    <nav className={styles.nav} aria-label="أقسام موسوعة نقادة">
      <div className={styles.rail}>
        {items.map((item) => {
          const active = item.key === current;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`${styles.item} ${active ? styles.active : ''}`}
              aria-current={active ? 'page' : undefined}
              prefetch={false}
            >
              <span>{item.label}</span>
              <small>{item.meta}</small>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
