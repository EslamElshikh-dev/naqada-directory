import Link from 'next/link';
import styles from './service-locality-discovery.module.css';

export type ServiceLocalityDiscoveryItem = {
  name: string;
  count: number;
  href: string;
};

export function ServiceLocalityDiscovery({
  eyebrow = 'أين تجد هذه الخدمة؟',
  title,
  description,
  items,
  resultsHref,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  items: ServiceLocalityDiscoveryItem[];
  resultsHref: string;
}) {
  if (!items.length) return null;

  return (
    <section className={styles.discovery} aria-label={title}>
      <div className={styles.heading}>
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <a href={resultsHref} className={styles.allResults}>كل النتائج ↓</a>
      </div>
      <nav className={styles.places} aria-label={`اختيار المكان لـ ${title}`}>
        {items.map((item, index) => (
          <Link key={`${item.name}-${item.href}`} href={item.href} prefetch={false} className={index === 0 ? styles.primaryPlace : undefined}>
            <span className={styles.rank} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className={styles.copy}><strong>{item.name}</strong><small>{item.count.toLocaleString('ar-EG')} نتيجة منشورة</small></span>
            <span className={styles.arrow} aria-hidden="true">←</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
