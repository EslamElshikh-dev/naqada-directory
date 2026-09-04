import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CategoryVisual } from '@/components/category-visual';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { businesses, canonicalLocalityName, categories, directoryBusinesses, getCategoryBySlug, localities } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  const description = `${category.description} تصفح ${category.count} نتيجة منشورة داخل مدينة نقادة وقراها.`;
  return buildPageMetadata({
    title: `${category.shortLabel} في نقادة`,
    description,
    path: `/directory/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const scoped = businesses.filter((item) => item.category === category.name);
  const scopedDirectory = directoryBusinesses.filter((item) => item.category === category.name);
  const localityCount = new Set(scoped.map((item) => canonicalLocalityName(item.locality))).size;
  const localityCounts = new Map<string, number>();
  for (const item of scoped) {
    const name = canonicalLocalityName(item.locality);
    localityCounts.set(name, (localityCounts.get(name) || 0) + 1);
  }
  const topLocalities = [...localityCounts.entries()]
    .map(([name, count]) => ({ locality: localities.find((item) => item.name === name), count }))
    .filter((item): item is { locality: NonNullable<typeof item.locality>; count: number } => Boolean(item.locality))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const pageUrl = `${siteConfig.url}/directory/${encodeURIComponent(category.slug)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${category.shortLabel} في نقادة`,
        url: pageUrl,
        description: category.description,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: scoped.length,
          itemListElement: scoped.slice(0, 20).map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'الدليل', item: `${siteConfig.url}/directory` },
          { '@type': 'ListItem', position: 3, name: category.shortLabel, item: pageUrl },
        ],
      },
    ],
  };
  return (
    <main id="main-content" className="page-main">
      <section className="detail-hero category-hero"><div className="shell category-hero__grid"><div><nav className="breadcrumbs"><Link href="/directory">الدليل</Link><span>/</span><span>{category.shortLabel}</span></nav><span className="eyebrow">قسم محلي متخصص</span><h1>{category.shortLabel} <em>في نقادة</em></h1><p>{category.description}</p><div className="hero-inline-stats"><span><b>{scoped.length.toLocaleString('ar-EG')}</b> نتيجة</span><span><b>{localityCount.toLocaleString('ar-EG')}</b> موضعًا</span></div></div><CategoryVisual category={category.name} size="lg" /></div></section>
      <section className="shell page-section">
        {topLocalities.length > 0 && <div className="category-pills" aria-label={`أبرز مناطق ${category.shortLabel} في نقادة`}>
          {topLocalities.map(({ locality, count }) => <Link key={locality.slug} href={count >= 3 ? `/villages/${locality.slug}/${category.slug}` : `/villages/${locality.slug}`}>{locality.name} <small>{count.toLocaleString('ar-EG')}</small></Link>)}
        </div>}
        <Suspense fallback={<div className="loading-state">جارٍ تجهيز النتائج…</div>}><DirectoryExplorer businesses={scopedDirectory} categories={categories} localities={localities} initialCategory={category.name} lockedCategory /></Suspense>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
