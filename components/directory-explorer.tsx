'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { Category, DirectoryItem, LocalityPage } from '@/lib/types';
import { hasBusinessMedia } from '@/lib/business-media';
import { normalizeSearchFields, prepareSearchQuery, scoreNormalizedSearchFields } from '@/lib/search-ranking';
import { privacySafeSearchTerm, trackEvent } from '@/lib/analytics-client';
import { ListingCard } from './listing-card';
import styles from './directory-explorer.module.css';

type SortMode = 'recommended' | 'rating' | 'name';

type FacetItem = {
  name: string;
  count: number;
};

export function DirectoryExplorer({
  businesses,
  categories,
  localities,
  initialCategory = '',
  initialLocality = '',
  lockedCategory = false,
  lockedLocality = false,
}: {
  businesses: DirectoryItem[];
  categories: Category[];
  localities: LocalityPage[];
  initialCategory?: string;
  initialLocality?: string;
  lockedCategory?: boolean;
  lockedLocality?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [locality, setLocality] = useState(initialLocality);
  const [sort, setSort] = useState<SortMode>('recommended');
  const [page, setPage] = useState(1);
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const pageSize = 12;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setQuery(searchParams.get('q') || '');
      setCategory(lockedCategory ? initialCategory : (initialCategory || searchParams.get('category') || ''));
      setLocality(lockedLocality ? initialLocality : (initialLocality || searchParams.get('locality') || ''));
      setHydratedFromUrl(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialCategory, initialLocality, lockedCategory, lockedLocality]);

  const indexedBusinesses = useMemo(() => businesses.map((item) => ({
    item,
    normalized: normalizeSearchFields({
      title: item.name,
      category: item.category,
      subcategory: item.subcategory,
      locality: item.locality,
      address: item.address,
      auxiliary: [item.normalizedName, item.parentLocality].filter(Boolean).join(' '),
    }),
  })), [businesses]);

  const rankedQueryMatches = useMemo(() => {
    const { normalizedQuery, tokens } = prepareSearchQuery(deferredQuery);
    return indexedBusinesses
      .map(({ item, normalized }) => ({
        item,
        rank: tokens.length ? scoreNormalizedSearchFields(normalized, normalizedQuery, tokens) : 0,
      }))
      .filter(({ rank }) => rank >= 0);
  }, [deferredQuery, indexedBusinesses]);

  const filtered = useMemo(() => {
    const hasQuery = Boolean(deferredQuery.trim());
    const matches = rankedQueryMatches
      .filter(({ item }) => {
        if (category && item.category !== category) return false;
        if (locality && (item.locality || 'مركز نقادة') !== locality) return false;
        return true;
      });

    matches.sort((a, b) => {
      if (sort === 'name') return a.item.name.localeCompare(b.item.name, 'ar');
      if (sort === 'rating') return (b.item.rating || 0) - (a.item.rating || 0) || (b.item.reviews || 0) - (a.item.reviews || 0);
      if (hasQuery && b.rank !== a.rank) return b.rank - a.rank;
      const mediaPriority = Number(hasBusinessMedia(b.item.id)) - Number(hasBusinessMedia(a.item.id));
      if (mediaPriority) return mediaPriority;
      return (b.item.reviews || 0) - (a.item.reviews || 0) || (b.item.rating || 0) - (a.item.rating || 0) || a.item.name.localeCompare(b.item.name, 'ar');
    });

    return matches.map(({ item }) => item);
  }, [category, deferredQuery, locality, rankedQueryMatches, sort]);

  const facets = useMemo(() => {
    if (!deferredQuery.trim()) return { categories: [] as FacetItem[], localities: [] as FacetItem[] };

    const categoryCounts = new Map<string, number>();
    const localityCounts = new Map<string, number>();

    for (const { item } of rankedQueryMatches) {
      if (item.category) categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1);
      const place = item.locality || 'مركز نقادة';
      localityCounts.set(place, (localityCounts.get(place) || 0) + 1);
    }

    const toTopFacets = (counts: Map<string, number>) => Array.from(counts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'))
      .slice(0, 5);

    return {
      categories: toTopFacets(categoryCounts),
      localities: toTopFacets(localityCounts),
    };
  }, [deferredQuery, rankedQueryMatches]);

  const categoryLabels = useMemo(() => new Map(categories.map((item) => [item.name, item.shortLabel])), [categories]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const trimmedQuery = query.trim();
  const hasActiveFilters = Boolean(trimmedQuery || category || locality);
  const filterConflict = filtered.length === 0 && rankedQueryMatches.length > 0 && Boolean(category || locality);

  useEffect(() => {
    if (!hydratedFromUrl) return;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category && !lockedCategory) params.set('category', category);
    if (locality && !lockedLocality) params.set('locality', locality);
    const suffix = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${suffix ? `?${suffix}` : ''}`);
  }, [category, hydratedFromUrl, locality, lockedCategory, lockedLocality, query]);

  useEffect(() => {
    const term = deferredQuery.trim();
    if (!term && !category && !locality) return;

    const timer = window.setTimeout(() => {
      const safeTerm = privacySafeSearchTerm(term);
      trackEvent(filtered.length === 0 ? 'Directory Zero Results' : 'Directory Search', {
        results: filtered.length,
        queryLength: term.length,
        category: category || 'all',
        locality: locality || 'all',
        ...(filtered.length === 0 && safeTerm ? { query: safeTerm } : {}),
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [category, deferredQuery, filtered.length, locality]);

  function reset() {
    setQuery('');
    if (!lockedCategory) setCategory('');
    if (!lockedLocality) setLocality('');
    setSort('recommended');
    setPage(1);
  }

  function clearResultFilters() {
    if (!lockedCategory) setCategory('');
    if (!lockedLocality) setLocality('');
    setPage(1);
  }

  const missingHref = `/contribute?type=missing${query ? `&q=${encodeURIComponent(query)}` : ''}`;

  return (
    <div className="explorer">
      <div className="explorer__tools">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">ابحث داخل الدليل</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} type="search" placeholder="ابحث باسم نشاط أو خدمة أو عنوان…" autoComplete="off" />
        </label>
        {!lockedLocality && <label className="select-field"><span>المكان</span><select value={locality} onChange={(event) => { setLocality(event.target.value); setPage(1); }}><option value="">كل المناطق</option>{localities.filter((item) => item.businessCount > 0).map((item) => <option key={item.slug} value={item.name}>{item.name} ({item.businessCount.toLocaleString('ar-EG')})</option>)}</select></label>}
        {!lockedCategory && <label className="select-field"><span>القسم</span><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">كل الأقسام</option>{categories.map((item) => <option key={item.slug} value={item.name}>{item.shortLabel} ({item.count.toLocaleString('ar-EG')})</option>)}</select></label>}
        <label className="select-field"><span>الترتيب</span><select value={sort} onChange={(event) => { setSort(event.target.value as SortMode); setPage(1); }}><option value="recommended">الأكثر صلة</option><option value="rating">الأعلى تقييمًا</option><option value="name">الاسم أبجديًا</option></select></label>
      </div>

      <div className="category-pills" aria-label="التصنيفات">
        {!lockedCategory && <button className={!category ? 'is-active' : ''} onClick={() => { setCategory(''); setPage(1); }} type="button">كل الأقسام</button>}
        {categories.slice(0, 12).map((item) => <button key={item.slug} className={category === item.name ? 'is-active' : ''} onClick={() => { setCategory(item.name); setPage(1); }} type="button">{item.shortLabel} <small>{item.count.toLocaleString('ar-EG')}</small></button>)}
      </div>

      {hydratedFromUrl && hasActiveFilters ? (
        <section className={styles.context} aria-label="ملخص البحث">
          <div className={styles.contextHead}>
            <div className={styles.contextCopy}>
              <span>{trimmedQuery ? 'نتائج البحث عن' : 'نتائج مفلترة'}</span>
              <strong>{trimmedQuery ? `«${trimmedQuery}»` : [categoryLabels.get(category) || category, locality].filter(Boolean).join(' · ')}</strong>
              <small>{category ? `القسم: ${categoryLabels.get(category) || category}` : 'كل الأقسام'} · {locality ? `المكان: ${locality}` : 'كل المناطق'} · الترتيب: {sort === 'recommended' ? 'الأكثر صلة' : sort === 'rating' ? 'الأعلى تقييمًا' : 'أبجديًا'}</small>
            </div>
            <span className={styles.count}><b>{filtered.length.toLocaleString('ar-EG')}</b><small>نتيجة</small></span>
          </div>

          {trimmedQuery && (facets.categories.length > 1 || facets.localities.length > 1) ? (
            <div className={styles.facets}>
              {!lockedCategory && facets.categories.length > 1 ? (
                <div className={styles.facetGroup}>
                  <span>ضيّق حسب نوع الخدمة</span>
                  <div className={styles.facetList}>
                    {facets.categories.map((item) => <button key={item.name} type="button" data-active={category === item.name} onClick={() => { setCategory(category === item.name ? '' : item.name); setPage(1); }}>{categoryLabels.get(item.name) || item.name}<small>{item.count.toLocaleString('ar-EG')}</small></button>)}
                  </div>
                </div>
              ) : null}
              {!lockedLocality && facets.localities.length > 1 ? (
                <div className={styles.facetGroup}>
                  <span>ضيّق حسب المكان</span>
                  <div className={styles.facetList}>
                    {facets.localities.map((item) => <button key={item.name} type="button" data-active={locality === item.name} onClick={() => { setLocality(locality === item.name ? '' : item.name); setPage(1); }}>{item.name}<small>{item.count.toLocaleString('ar-EG')}</small></button>)}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="results-bar" aria-live="polite">
        <div><strong>{filtered.length.toLocaleString('ar-EG')}</strong><span> نتيجة مطابقة</span></div>
        {(query || (!lockedCategory && category) || (!lockedLocality && locality)) && <button type="button" onClick={reset}>مسح الفلاتر</button>}
      </div>

      {visible.length ? <div className="listing-grid">{visible.map((item) => <ListingCard key={item.id} listing={item} />)}</div> : <div className="empty-state"><strong>{filterConflict ? 'العبارة موجودة لكن الفلاتر ضيّقت النتائج أكثر من اللازم' : 'لا توجد نتيجة مطابقة'}</strong><p>{filterConflict ? 'وسّع المكان أو القسم مع الاحتفاظ بعبارة البحث، وستظهر النتائج المطابقة المتاحة.' : 'جرّب اسمًا أقصر أو اختر منطقة وتصنيفًا مختلفين. وإذا كانت الخدمة أو النشاط غير موجودين، أخبرنا بما تبحث عنه.'}</p>{filterConflict ? <div className={styles.recovery}>{category && !lockedCategory ? <button type="button" onClick={() => { setCategory(''); setPage(1); }}>إزالة فلتر القسم</button> : null}{locality && !lockedLocality ? <button type="button" onClick={() => { setLocality(''); setPage(1); }}>إزالة فلتر المكان</button> : null}{category && locality && (!lockedCategory || !lockedLocality) ? <button type="button" onClick={clearResultFilters}>عرض كل نتائج العبارة</button> : null}</div> : null}<div className="detail-actions"><button className="button button--primary" onClick={reset} type="button">إعادة الضبط</button><Link className="button button--ghost" href={missingHref} onClick={() => trackEvent('Missing Result Contribution Intent', { hasQuery: Boolean(query), locality: locality || 'all', category: category || 'all' })}>اقترح نتيجة مفقودة</Link></div></div>}

      {totalPages > 1 && <nav className="pagination" aria-label="صفحات النتائج">
        <button type="button" disabled={currentPage === 1} onClick={() => { setPage((value) => Math.max(1, value - 1)); document.querySelector('.results-bar')?.scrollIntoView({ behavior: 'smooth' }); }}>السابق</button>
        <span>صفحة {currentPage.toLocaleString('ar-EG')} من {totalPages.toLocaleString('ar-EG')}</span>
        <button type="button" disabled={currentPage === totalPages} onClick={() => { setPage((value) => Math.min(totalPages, value + 1)); document.querySelector('.results-bar')?.scrollIntoView({ behavior: 'smooth' }); }}>التالي</button>
      </nav>}
    </div>
  );
}