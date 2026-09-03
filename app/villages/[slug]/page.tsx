import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { BrandMark } from '@/components/site-shell';
import { businesses, categories, directoryBusinesses, getLocalityBySlug, localities } from '@/lib/data';
import { isSafeExternalUrl, siteConfig } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return localities.map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locality = getLocalityBySlug(slug);
  if (!locality) return {};
  return {
    title: `دليل ${locality.name} — مركز نقادة`,
    description: `الخدمات والأنشطة المنشورة في ${locality.name} ضمن مركز نقادة بمحافظة قنا، مع معلومات الموضع وروابط الوصول.`,
    alternates: { canonical: `/villages/${locality.slug}` },
    robots: locality.businessCount > 0 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function LocalityPage({ params }: Props) {
  const { slug } = await params;
  const locality = getLocalityBySlug(slug);
  if (!locality) notFound();
  const scoped = businesses.filter((item) => (item.locality || 'مركز نقادة') === locality.name);
  const scopedDirectory = directoryBusinesses.filter((item) => (item.locality || 'مركز نقادة') === locality.name);
  const categoryCount = new Set(scoped.map((item) => item.category)).size;
  const categoryCounts = new Map<string, number>();
  for (const item of scoped) categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1);
  const topCategories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ category: categories.find((item) => item.name === name), count }))
    .filter((item): item is { category: NonNullable<typeof item.category>; count: number } => Boolean(item.category))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const canonicalUrl = `${siteConfig.url}/villages/${encodeURIComponent(locality.slug)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Place',
        name: locality.name,
        containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز نقادة، قنا، مصر' },
        url: canonicalUrl,
      },
      {
        '@type': 'ItemList',
        numberOfItems: scoped.length,
        itemListElement: scoped.slice(0, 20).map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'القرى والنجوع', item: `${siteConfig.url}/villages` },
          { '@type': 'ListItem', position: 3, name: locality.name, item: canonicalUrl },
        ],
      },
    ],
  };
  return (
    <main id="main-content" className="page-main">
      <section className="village-hero"><div className="shell village-hero__grid"><div><nav className="breadcrumbs"><Link href="/villages">القرى والنجوع</Link><span>/</span><span>{locality.name}</span></nav><div className="village-hero__identity"><BrandMark /><div><span className="eyebrow">{locality.type} ضمن نطاق مركز نقادة</span><small>{locality.classification}</small></div></div><h1>{locality.name}</h1><p>{locality.notes || locality.scope || `موضع محلي ضمن مركز نقادة بمحافظة قنا.`}</p><div className="detail-actions"><a href="#locality-listings" className="button button--light">عرض الأنشطة</a><Link href="/villages" className="button button--outline-light">كل المواضع</Link></div></div><aside className="village-hero__summary"><span>ملخص الموضع</span><div className="catalog-hero__metrics"><span><b>{scoped.length.toLocaleString('ar-EG')}</b><small>سجلًا منشورًا</small></span><span><b>{categoryCount.toLocaleString('ar-EG')}</b><small>قسمًا متاحًا</small></span><span><b>{locality.verification || 'مراجع'}</b><small>حالة الإدراج</small></span></div>{isSafeExternalUrl(locality.source) && <a href={locality.source || '#'} target="_blank" rel="noreferrer">مصدر الموضع ↗</a>}</aside></div></section>
      <section id="locality-listings" className="shell page-section">
        <div className="locality-summary"><div><span>النوع</span><strong>{locality.type}</strong></div><div><span>النطاق الإداري</span><strong>{locality.center || 'مركز نقادة'}</strong></div><div><span>التصنيف</span><strong>{locality.classification || 'موضع محلي'}</strong></div></div>
        {topCategories.length > 0 && <div className="category-pills" aria-label={`أشهر أقسام ${locality.name}`}>
          {topCategories.map(({ category, count }) => <Link key={category.slug} href={`/directory/${category.slug}?locality=${encodeURIComponent(locality.name)}`}>{category.shortLabel} <small>{count.toLocaleString('ar-EG')}</small></Link>)}
        </div>}
        {scoped.length ? <Suspense fallback={<div className="loading-state">جارٍ تجهيز الأنشطة…</div>}><DirectoryExplorer businesses={scopedDirectory} categories={categories} localities={localities} initialLocality={locality.name} lockedLocality /></Suspense> : <div className="empty-state"><strong>لم تُنشر أنشطة مؤكدة لهذا الموضع بعد</strong><p>الموضع موجود في الهيكل الجغرافي، لكنه غير مفهرس كصفحة نتائج حتى تتوفر له بيانات منشورة كافية.</p><Link href="/directory" className="button button--primary">فتح الدليل الشامل</Link></div>}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
