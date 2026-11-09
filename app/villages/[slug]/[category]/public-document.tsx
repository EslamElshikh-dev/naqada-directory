
import '@/app/route-styles/villages-slug-category.css';
import { NUMBER_LOCALE } from '@/lib/format-number';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { CategoryVisual } from '@/components/category-visual';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { LocalCategoryDiscovery } from '@/components/local-category-discovery';
import { canonicalLocalityName, categories, getCanonicalLocalitySlugAlias, getCategoryBySlug, getLocalityBySlug, localities } from '@/lib/data';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { MIN_LOCAL_CATEGORY_RESULTS } from '@/lib/discovery-routing';
import { absoluteUrl, buildPageMetadata, jsonLdStringify, localityContext } from '@/lib/site';

import { DIRECTORY_PAGE_SIZE, directoryPageMetadata, directoryQuerySuffix, directoryResults, resolveDirectoryState, type DirectorySearchParams } from '@/lib/directory-state';
import { publicBusinessHref } from '@/lib/business-links';
type Props = { params: Promise<{ slug: string; category: string }>; searchParams: Promise<DirectorySearchParams> };
export const revalidate = 3600;


export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, category: categorySlug } = await params;
  const locality = getLocalityBySlug(slug);
  const category = getCategoryBySlug(categorySlug);
  if (!locality || !category) return {};
  const { businesses: currentBusinesses, directoryBusinesses } = await getPublicBusinessCatalog();
  const count = currentBusinesses.filter((item) => canonicalLocalityName(item.locality) === locality.name && item.category === category.name).length;
  if (count < MIN_LOCAL_CATEGORY_RESULTS) return { robots: { index: false, follow: true } };
  const description = `دليل ${category.shortLabel} في ${localityContext(locality.name)}: ${count} نتيجة منشورة مع بيانات الوصول والهاتف والخريطة حسب المتاح.`;
  const scoped = directoryBusinesses.filter(item => canonicalLocalityName(item.locality) === locality.name && item.category === category.name);
  const state = resolveDirectoryState(await searchParams, scoped, { categories, localities, lockedCategory: category.name, lockedLocality: locality.name });
  const metadata = buildPageMetadata({
    title: `${state.page > 1 ? `صفحة ${state.page} — ` : ''}${category.shortLabel} في ${locality.name} — نقادة`,
    description,
    path: `/villages/${locality.slug}/${category.slug}`,
  });
  return directoryPageMetadata(metadata, `/villages/${locality.slug}/${category.slug}`, state);
}

export default async function LocalCategoryPage({ params, searchParams }: Props) {
  const { slug, category: categorySlug } = await params;
  const canonicalAlias = getCanonicalLocalitySlugAlias(slug);
  if (canonicalAlias) permanentRedirect(`/villages/${encodeURIComponent(canonicalAlias)}/${encodeURIComponent(categorySlug)}/${directoryQuerySuffix(await searchParams)}`);
  const locality = getLocalityBySlug(slug);
  const category = getCategoryBySlug(categorySlug);
  if (!locality || !category) notFound();

  const { businesses, directoryBusinesses } = await getPublicBusinessCatalog();
  const scoped = businesses.filter((item) => canonicalLocalityName(item.locality) === locality.name && item.category === category.name);
  if (scoped.length < MIN_LOCAL_CATEGORY_RESULTS) notFound();
  const scopedDirectory = directoryBusinesses.filter((item) => canonicalLocalityName(item.locality) === locality.name && item.category === category.name);
  const basePath = `/villages/${encodeURIComponent(locality.slug)}/${encodeURIComponent(category.slug)}/`;
  const state = resolveDirectoryState(await searchParams, scopedDirectory, { categories, localities, lockedCategory: category.name, lockedLocality: locality.name });
  const results = directoryResults(scopedDirectory, state, localities.map(item => item.name));
  const offset = (state.page - 1) * DIRECTORY_PAGE_SIZE;
  const pageUrl = absoluteUrl(basePath) + (!state.hasFilters && state.page > 1 ? `?page=${state.page}` : '');
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${category.shortLabel} في ${locality.name}`,
        url: pageUrl,
        description: `نتائج ${category.shortLabel} المنشورة في ${localityContext(locality.name)}.`,
        about: { '@type': 'Place', name: `${localityContext(locality.name)}، قنا` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: results.length,
          itemListElement: results.slice(offset, offset + DIRECTORY_PAGE_SIZE).map((item, index) => ({
            '@type': 'ListItem',
            position: offset + index + 1,
            name: item.name,
            url: absoluteUrl(publicBusinessHref(item)),
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: locality.name, item: absoluteUrl(`/villages/${encodeURIComponent(locality.slug)}`) },
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
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link prefetch={false} href="/villages">القرى والنجوع</Link><span>/</span><Link prefetch={false} href={`/villages/${locality.slug}`}>{locality.name}</Link><span>/</span><span>{category.shortLabel}</span></nav>
            <span className="eyebrow">بحث محلي داخل {locality.name}</span>
            <h1>{category.shortLabel} <em>في {locality.name}</em></h1>
            <p>{category.description} هذه الصفحة تعرض النتائج المنشورة داخل {locality.name} فقط.</p>
            <div className="hero-inline-stats"><span><b>{scoped.length.toLocaleString(NUMBER_LOCALE)}</b> نتيجة</span><span><b>مركز نقادة</b> · قنا</span></div>
            <div className="detail-actions"><Link prefetch={false} href={`/villages/${locality.slug}`} className="button button--light">دليل {locality.name}</Link><Link prefetch={false} href={`/directory/${category.slug}`} className="button button--outline-light">كل {category.shortLabel} في نقادة</Link><a href="#local-category-discovery" className="button button--outline-light">استكشف أسرع ↓</a></div>
          </div>
          <CategoryVisual category={category.name} size="lg" />
        </div>
      </section>

      <section className="shell page-section">
        <LocalCategoryDiscovery
          localityName={locality.name}
          localitySlug={locality.slug}
          categoryName={category.name}
          categoryLabel={category.shortLabel}
          scoped={scoped}
        />
        <div id="local-category-results">
          <Suspense fallback={<div className="loading-state">جارٍ تجهيز النتائج…</div>}>
            <DirectoryExplorer key={`${state.q}|${state.sort}|${state.page}`} basePath={basePath} businesses={scopedDirectory} categories={categories} localities={localities} initialQuery={state.q} initialCategory={state.category} initialLocality={state.locality} initialSort={state.sort} initialPage={state.page} lockedCategory lockedLocality />
          </Suspense>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}

export async function generateStaticParams() { const { businesses } = await getPublicBusinessCatalog(); return localities.flatMap(place => categories.filter(category => businesses.filter(item => canonicalLocalityName(item.locality) === place.name && item.category === category.name).length >= MIN_LOCAL_CATEGORY_RESULTS).map(category => ({ slug: place.slug, category: category.slug }))); }
