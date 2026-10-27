import '@/app/route-styles/directory.css';
import { NUMBER_LOCALE } from '@/lib/format-number';
import type { Metadata } from 'next';
import { buildPageMetadata, siteConfig } from '@/lib/site';
import { Suspense } from 'react';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { UtilityPageHeader } from '@/components/utility-page-header';
import { categories, familySearchPages, localities } from '@/lib/data';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import Link from 'next/link';

type DirectorySearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  locality?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}>;

type Props = { searchParams: DirectorySearchParams };

const pageSize = 12;
export const dynamic = 'force-dynamic';
const description = 'ابحث وصَفِّ الأنشطة والخدمات المنشورة في مدينة نقادة وقراها ونجوعها بحسب الاسم والتصنيف والمكان.';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function resolveDirectoryState(params: Awaited<DirectorySearchParams>, businessCount: number) {
  const q = firstValue(params.q).trim().slice(0, 100);
  const requestedCategory = firstValue(params.category);
  const requestedLocality = firstValue(params.locality);
  const requestedSort = firstValue(params.sort);
  const category = categories.some((item) => item.name === requestedCategory) ? requestedCategory : '';
  const locality = localities.some((item) => item.name === requestedLocality) ? requestedLocality : '';
  const sort = requestedSort === 'rating' || requestedSort === 'name' ? requestedSort : 'recommended';
  const requestedPage = Number.parseInt(firstValue(params.page), 10);
  const totalPages = Math.max(1, Math.ceil(businessCount / pageSize));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  return { q, category, locality, sort, page, totalPages } as const;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [params, catalog] = await Promise.all([searchParams, getPublicBusinessCatalog()]);
  const state = resolveDirectoryState(params, catalog.directoryBusinesses.length);
  const hasFilters = Boolean(state.q || state.category || state.locality || state.sort !== 'recommended');
  const pageLabel = state.page > 1 ? ` – صفحة ${state.page.toLocaleString(NUMBER_LOCALE)}` : '';
  const pageHref = state.page > 1 ? `/directory/?page=${state.page}` : '/directory/';

  const canonical = hasFilters ? '/directory/' : pageHref;
  const metadata = buildPageMetadata({
    title: `دليل الخدمات والأنشطة في نقادة${pageLabel}`,
    description,
    path: '/directory',
    ...(hasFilters ? { robots: { index: false, follow: true } } : {}),
  });
  return {
    ...metadata,
    alternates: { canonical },
    openGraph: { ...metadata.openGraph, url: `${siteConfig.url}${canonical}` },
    pagination: hasFilters ? undefined : {
      previous: state.page > 1 ? (state.page === 2 ? '/directory/' : `/directory/?page=${state.page - 1}`) : null,
      next: state.page < state.totalPages ? `/directory/?page=${state.page + 1}` : null,
    },
  };
}

export default async function DirectoryPage({ searchParams }: Props) {
  const [params, catalog] = await Promise.all([searchParams, getPublicBusinessCatalog()]);
  const { businesses, directoryBusinesses } = catalog;
  const state = resolveDirectoryState(params, directoryBusinesses.length);
  const mapped = businesses.filter((item) => item.mapsUrl).length;
  const phoned = businesses.filter((item) => item.phone).length;
  return (
    <main id="main-content" className="page-main">
      <UtilityPageHeader current="الدليل" eyebrow="دليل الخدمات والأنشطة"
        title={<>كل خدمات نقادة في <em>بحث واحد</em></>}
        description="اكتب اسم النشاط أو الخدمة، وحدّد القرية أو القسم للوصول إلى النتائج."
        metrics={[
          { value: directoryBusinesses.length.toLocaleString(NUMBER_LOCALE), label: 'نشاط منشور' },
          { value: categories.length.toLocaleString(NUMBER_LOCALE), label: 'قسم' },
          { value: mapped.toLocaleString(NUMBER_LOCALE), label: 'رابط خريطة' },
          { value: phoned.toLocaleString(NUMBER_LOCALE), label: 'رقم اتصال' },
        ]} />
      <section className="shell page-section">
        <Suspense fallback={<div className="loading-state" style={{ minHeight: '100svh' }}>جارٍ تجهيز الدليل…</div>}>
          <DirectoryExplorer
            key={`${state.q}|${state.category}|${state.locality}|${state.sort}|${state.page}`}
            businesses={directoryBusinesses}
            familyPages={familySearchPages}
            categories={categories}
            localities={localities}
            initialQuery={state.q}
            initialCategory={state.category}
            initialLocality={state.locality}
            initialSort={state.sort}
            initialPage={state.page}
          />
        </Suspense>
      </section>
      <section className="shell directory-activity-cta" aria-label="تصفح أنواع الأنشطة">
        <div><span className="eyebrow eyebrow--dark">تصفّح حسب نوع الخدمة</span><h2>تفضّل تختار القسم؟</h2><p>صيدليات وأطباء ومدارس ومطاعم وبقية الخدمات المحلية.</p></div>
        <Link href="/activities" className="button button--primary">كل أنواع الخدمات</Link>
      </section>
    </main>
  );
}
