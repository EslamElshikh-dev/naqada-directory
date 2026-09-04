'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Category, DirectoryItem, LocalityPage } from '@/lib/types';
import { normalizeArabic } from '@/lib/site';
import { privacySafeSearchTerm, trackEvent } from '@/lib/analytics-client';
import { ListingCard } from './listing-card';

type SortMode = 'recommended' | 'rating' | 'name';

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
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(initialCategory || searchParams.get('category') || '');
  const [locality, setLocality] = useState(initialLocality || searchParams.get('locality') || '');
  const [sort, setSort] = useState<SortMode>('recommended');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const pageSize = 12;

  const filtered = useMemo(() => {
    const tokens = normalizeArabic(deferredQuery).split(' ').filter(Boolean);
    const matches = businesses.filter((item) => {
      if (category && item.category !== category) return false;
      if (locality && (item.locality || 'مركز نقادة') !== locality) return false;
      if (!tokens.length) return true;
      const haystack = normalizeArabic([item.name, item.normalizedName, item.category, item.subcategory, item.locality, item.address].filter(Boolean).join(' '));
      return tokens.every((token) => haystack.includes(token));
    });
    return matches.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ar');
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0);
      return (b.reviews || 0) - (a.reviews || 0) || (b.rating || 0) - (a.rating || 0) || a.name.localeCompare(b.name, 'ar');
    });
  }, [businesses, category, deferredQuery, locality, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category && !lockedCategory) params.set('category', category);
    if (locality && !lockedLocality) params.set('locality', locality);
    const suffix = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${suffix ? `?${suffix}` : ''}`);
  }, [category, locality, lockedCategory, lockedLocality, query]);

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
        <label className="select-field"><span>الترتيب</span><select value={sort} onChange={(event) => { setSort(event.target.value as SortMode); setPage(1); }}><option value="recommended">الأكثر حضورًا</option><option value="rating">الأعلى تقييمًا</option><option value="name">الاسم أبجديًا</option></select></label>
      </div>

      <div className="category-pills" aria-label="التصنيفات">
        {!lockedCategory && <button className={!category ? 'is-active' : ''} onClick={() => { setCategory(''); setPage(1); }} type="button">كل الأقسام</button>}
        {categories.slice(0, 12).map((item) => <button key={item.slug} className={category === item.name ? 'is-active' : ''} onClick={() => { setCategory(item.name); setPage(1); }} type="button">{item.shortLabel} <small>{item.count.toLocaleString('ar-EG')}</small></button>)}
      </div>

      <div className="results-bar">
        <div><strong>{filtered.length.toLocaleString('ar-EG')}</strong><span> نتيجة مطابقة</span></div>
        {(query || (!lockedCategory && category) || (!lockedLocality && locality)) && <button type="button" onClick={reset}>مسح الفلاتر</button>}
      </div>

      {visible.length ? <div className="listing-grid">{visible.map((item) => <ListingCard key={item.id} listing={item} />)}</div> : <div className="empty-state"><strong>لا توجد نتيجة مطابقة</strong><p>جرّب اسمًا أقصر أو اختر منطقة وتصنيفًا مختلفين. وإذا كانت الخدمة أو النشاط غير موجودين، أخبرنا بما تبحث عنه.</p><div className="detail-actions"><button className="button button--primary" onClick={reset} type="button">إعادة الضبط</button><Link className="button button--ghost" href={missingHref} onClick={() => trackEvent('Missing Result Contribution Intent', { hasQuery: Boolean(query), locality: locality || 'all', category: category || 'all' })}>اقترح نتيجة مفقودة</Link></div></div>}

      {totalPages > 1 && <nav className="pagination" aria-label="صفحات النتائج">
        <button type="button" disabled={currentPage === 1} onClick={() => { setPage((value) => Math.max(1, value - 1)); document.querySelector('.results-bar')?.scrollIntoView({ behavior: 'smooth' }); }}>السابق</button>
        <span>صفحة {currentPage.toLocaleString('ar-EG')} من {totalPages.toLocaleString('ar-EG')}</span>
        <button type="button" disabled={currentPage === totalPages} onClick={() => { setPage((value) => Math.min(totalPages, value + 1)); document.querySelector('.results-bar')?.scrollIntoView({ behavior: 'smooth' }); }}>التالي</button>
      </nav>}
    </div>
  );
}
