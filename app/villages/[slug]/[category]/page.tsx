import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CategoryVisual } from '@/components/category-visual';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { businesses, canonicalLocalityName, categories, directoryBusinesses, getCategoryBySlug, getLocalityBySlug, localities } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

type Props = { params: Promise<{ slug: string; category: string }> };

const minimumResults = 3;

export function generateStaticParams() {
  const counts = new Map<string, { slug: string; category: string; count: number }>();
  for (const business of businesses) {
    const locality = localities.find((item) => item.name === canonicalLocalityName(business.locality));
    const category = categories.find((item) => item.name === business.category);
    if (!locality || !category) continue;
    const key = `${locality.slug}::${category.slug}`;
    const current = counts.get(key);
    counts.set(key, { slug: locality.slug, category: category.slug, count: (current?.count || 0) + 1 });
  }
  return [...counts.values()].filter((item) => item.count >= minimumResults).map(({ slug, category }) => ({ slug, category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, category: categorySlug } = await params;
  const locality = getLocalityBySlug(slug);
  const category = getCategoryBySlug(categorySlug);
  if (!locality || !category) return {};
  const count = businesses.filter((item) => canonicalLocalityName(item.locality) === locality.name && item.category === category.name).length;
  if (count < minimumResults) return { robots: { index: false, follow: true } };
  const description = `دليل ${category.shortLabel} في ${locality.name} بمركز نقادة: ${count} نتيجة منشورة مع بيانات الوصول والهاتف والخريطة حسب المتاح.`;
  return buildPageMetadata({
    title: `${category.shortLabel} في ${locality.name} — نقادة`,
    description,
    path: `/villages/${locality.slug}/${category.slug}`,
  });
}

export default async function LocalCategoryPage({ params }: Props) {
  const { slug, category: categorySlug } = await params;
  const locality = getLocalityBySlug(slug);
  const category = getCategoryBySlug(categorySlug);
  if (!locality || !category) notFound();

  const scoped = businesses.filter((item) => canonicalLocalityName(item.locality) === locality.name && item.category === category.name);
  if (scoped.length < minimumResults) notFound();
  const scopedDirectory = directoryBusinesses.filter((item) => canonicalLocalityName(item.locality) === locality.name && item.category === category.name);
  const pageUrl = `${siteConfig.url}/villages/${encodeURIComponent(locality.slug)}/${encodeURIComponent(category.slug)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${category.shortLabel} في ${locality.name}`,
        url: pageUrl,
        description: `نتائج ${category.shortLabel} المنشورة في ${locality.name} ضمن مركز نقادة.`,
        about: { '@type': 'Place', name: `${locality.name}، مركز نقادة، قنا` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: scoped.length,
          itemListElement: scoped.map((item, index) => ({
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
          { '@type': 'ListItem', position: 2, name: locality.name, item: `${siteConfig.url}/villages/${encodeURIComponent(locality.slug)}` },
          { '@type': 'ListItem', position: 3, name: category.shortLabel, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="detail-hero category-hero">
        <div className="shell category-hero__grid">
          <div>
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/villages">القرى والنجوع</Link><span>/</span><Link href={`/villages/${locality.slug}`}>{locality.name}</Link><span>/</span><span>{category.shortLabel}</span></nav>
            <span className="eyebrow">بحث محلي داخل {locality.name}</span>
            <h1>{category.shortLabel} <em>في {locality.name}</em></h1>
            <p>{category.description} هذه الصفحة تعرض النتائج المنشورة داخل {locality.name} فقط.</p>
            <div className="hero-inline-stats"><span><b>{scoped.length.toLocaleString('ar-EG')}</b> نتيجة</span><span><b>مركز نقادة</b> · قنا</span></div>
            <div className="detail-actions"><Link href={`/villages/${locality.slug}`} className="button button--light">دليل {locality.name}</Link><Link href={`/directory/${category.slug}`} className="button button--outline-light">كل {category.shortLabel} في نقادة</Link></div>
          </div>
          <CategoryVisual category={category.name} size="lg" />
        </div>
      </section>

      <section className="shell page-section">
        <Suspense fallback={<div className="loading-state">جارٍ تجهيز النتائج…</div>}>
          <DirectoryExplorer businesses={scopedDirectory} categories={categories} localities={localities} initialCategory={category.name} initialLocality={locality.name} lockedCategory lockedLocality />
        </Suspense>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
