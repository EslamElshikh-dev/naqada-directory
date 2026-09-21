import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { BrandMark } from '@/components/site-shell';
import { businesses, categories, directoryBusinesses, localities } from '@/lib/data';
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
const description = 'ابحث وصَفِّ الأنشطة والخدمات المنشورة في مدينة نقادة وقراها ونجوعها بحسب الاسم والتصنيف والمكان.';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function resolveDirectoryState(params: Awaited<DirectorySearchParams>) {
  const q = firstValue(params.q).trim().slice(0, 100);
  const requestedCategory = firstValue(params.category);
  const requestedLocality = firstValue(params.locality);
  const requestedSort = firstValue(params.sort);
  const category = categories.some((item) => item.name === requestedCategory) ? requestedCategory : '';
  const locality = localities.some((item) => item.name === requestedLocality) ? requestedLocality : '';
  const sort = requestedSort === 'rating' || requestedSort === 'name' ? requestedSort : 'recommended';
  const requestedPage = Number.parseInt(firstValue(params.page), 10);
  const totalPages = Math.max(1, Math.ceil(directoryBusinesses.length / pageSize));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  return { q, category, locality, sort, page, totalPages } as const;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = resolveDirectoryState(await searchParams);
  const hasFilters = Boolean(state.q || state.category || state.locality || state.sort !== 'recommended');
  const pageLabel = state.page > 1 ? ` – صفحة ${state.page.toLocaleString('ar-EG')}` : '';
  const pageHref = state.page > 1 ? `/directory/?page=${state.page}` : '/directory/';

  return {
    title: `دليل الخدمات والأنشطة في نقادة${pageLabel}`,
    description,
    alternates: { canonical: hasFilters ? '/directory/' : pageHref },
    ...(hasFilters ? { robots: { index: false, follow: true } } : {}),
    pagination: hasFilters ? undefined : {
      previous: state.page > 1 ? (state.page === 2 ? '/directory/' : `/directory/?page=${state.page - 1}`) : null,
      next: state.page < state.totalPages ? `/directory/?page=${state.page + 1}` : null,
    },
  };
}

export default async function DirectoryPage({ searchParams }: Props) {
  const state = resolveDirectoryState(await searchParams);
  const mapped = businesses.filter((item) => item.mapsUrl).length;
  const phoned = businesses.filter((item) => item.phone).length;
  return (
    <main id="main-content" className="page-main">
      <section className="catalog-hero">
        <div className="shell catalog-hero__grid">
          <div><nav className="breadcrumbs"><span>الرئيسية</span><span>/</span><span>الدليل</span></nav><span className="eyebrow">دليل الخدمات والأنشطة</span><h1>كل خدمات نقادة في <em>بحث واحد</em></h1><p>اكتب اسم المكان أو الخدمة، ثم ضيّق النتائج حسب القرية أو القسم. كل بطاقة تفتح صفحة تفصيلية مستقلة.</p></div>
          <aside className="catalog-hero__summary"><span className="catalog-hero__mark"><BrandMark /></span><div className="catalog-hero__metrics"><span><b>{businesses.length.toLocaleString('ar-EG')}</b><small>سجلًا منشورًا</small></span><span><b>{categories.length.toLocaleString('ar-EG')}</b><small>قسمًا</small></span><span><b>{mapped.toLocaleString('ar-EG')}</b><small>رابط خريطة</small></span><span><b>{phoned.toLocaleString('ar-EG')}</b><small>رقم اتصال</small></span></div></aside>
        </div>
      </section>
      <section className="shell directory-activity-cta" aria-label="تصفح أنواع الأنشطة">
        <div><span className="eyebrow eyebrow--dark">صفحات مهيأة للبحث</span><h2>تبحث عن نوع نشاط محدد في نقادة؟</h2><p>تصفح الصيدليات والمدارس والمطاعم والأطباء والبنوك وبقية الخدمات في صفحات مستقلة تضم أسماء الأنشطة المنشورة.</p></div>
        <Link href="/activities" className="button button--primary">عرض الأنشطة بالأسماء</Link>
      </section>
      <section className="shell page-section">
        <Suspense fallback={<div className="loading-state">جارٍ تجهيز الدليل…</div>}>
          <DirectoryExplorer
            key={`${state.q}|${state.category}|${state.locality}|${state.sort}|${state.page}`}
            businesses={directoryBusinesses}
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
    </main>
  );
}
