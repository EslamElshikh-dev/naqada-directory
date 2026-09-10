import type { ReactNode } from 'react';
import Link from 'next/link';
import { businesses, canonicalLocalityName, categories, getLocalityBySlug } from '@/lib/data';
import styles from './locality-discovery.module.css';

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function LocalityLayout({ children, params }: Props) {
  const { slug } = await params;
  const locality = getLocalityBySlug(slug);

  if (!locality) return children;

  const categoryCounts = new Map<string, number>();
  let businessCount = 0;

  for (const business of businesses) {
    if (canonicalLocalityName(business.locality) !== locality.name) continue;
    businessCount += 1;
    categoryCounts.set(business.category, (categoryCounts.get(business.category) || 0) + 1);
  }

  const quickCategories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ category: categories.find((item) => item.name === name), count }))
    .filter((item): item is { category: NonNullable<typeof item.category>; count: number } => Boolean(item.category))
    .sort((a, b) => b.count - a.count || a.category.shortLabel.localeCompare(b.category.shortLabel, 'ar'))
    .slice(0, 6);

  if (!businessCount) return children;

  return (
    <>
      <nav className={styles.contextBar} aria-label={`استكشاف سريع داخل ${locality.name}`}>
        <div className={`shell ${styles.inner}`}>
          <Link className={styles.identity} href={`/villages/${locality.slug}`} prefetch={false}>
            <span>داخل</span>
            <strong>{locality.name}</strong>
            <small>{businessCount.toLocaleString('ar-EG')} نشاطًا</small>
          </Link>

          <div className={styles.links}>
            <Link className={styles.all} href={`/villages/${locality.slug}#locality-listings`} prefetch={false}>
              كل الخدمات
              <span aria-hidden="true">↓</span>
            </Link>
            {quickCategories.map(({ category, count }) => {
              const href = count >= 3
                ? `/villages/${locality.slug}/${category.slug}`
                : `/directory/${category.slug}?locality=${encodeURIComponent(locality.name)}`;
              return (
                <Link key={category.slug} href={href} prefetch={false}>
                  {category.shortLabel}
                  <small>{count.toLocaleString('ar-EG')}</small>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
