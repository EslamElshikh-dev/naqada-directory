'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

type SearchItem = {
  kind: 'listing' | 'category' | 'locality' | 'landmark' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

type SearchResponse = { items?: SearchItem[]; error?: string };

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10.7" cy="10.7" r="5.8" />
      <path d="m15.1 15.1 4 4" />
    </svg>
  );
}

function resultGlyph(kind: SearchItem['kind']) {
  if (kind === 'listing') return '⌖';
  if (kind === 'category') return '▦';
  if (kind === 'locality') return '⌂';
  if (kind === 'landmark') return '◇';
  return '↗';
}

export function GlobalSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;

  const status = useMemo(() => {
    if (!canSearch) return 'اكتب حرفين على الأقل لبدء البحث السريع.';
    if (loading) return 'جارٍ البحث داخل دليل نقادة…';
    if (error) return error;
    if (!items.length) return 'لا توجد نتيجة مباشرة؛ اضغط Enter للبحث الموسّع.';
    return `${items.length.toLocaleString('ar-EG')} نتائج سريعة`;
  }, [canSearch, error, items.length, loading]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !canSearch) {
      requestRef.current?.abort();
      const resetTimer = window.setTimeout(() => {
        setItems([]);
        setLoading(false);
        setError('');
        setActiveIndex(-1);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    const timer = window.setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/site-search/?q=${encodeURIComponent(trimmedQuery)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({})) as SearchResponse;
        if (!response.ok) throw new Error(payload.error || 'تعذر تنفيذ البحث الآن.');
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setActiveIndex(-1);
      } catch (cause) {
        if ((cause as Error)?.name === 'AbortError') return;
        setItems([]);
        setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ البحث الآن.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [canSearch, open, trimmedQuery]);

  function navigate(href: string) {
    setOpen(false);
    setActiveIndex(-1);
    router.push(href);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedQuery) return;
    if (activeIndex >= 0 && items[activeIndex]) navigate(items[activeIndex].href);
    else navigate(`/directory?q=${encodeURIComponent(trimmedQuery)}`);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((value) => value >= items.length - 1 ? 0 : value + 1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((value) => value <= 0 ? items.length - 1 : value - 1);
    }
  }

  return (
    <div ref={rootRef} className={`global-search${open ? ' is-open' : ''}`}>
      <button type="button" className="global-search__trigger" aria-label="البحث في دليل نقادة" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <SearchIcon /><span>بحث</span>
      </button>
      {open ? (
        <div className="global-search__panel" role="dialog" aria-label="البحث في دليل نقادة">
          <div className="global-search__head">
            <div><span>بحث موحّد</span><strong>ماذا تبحث عنه في نقادة؟</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق البحث">×</button>
          </div>
          <form className="global-search__form" role="search" onSubmit={submit}>
            <span className="global-search__field-icon"><SearchIcon /></span>
            <label className="sr-only" htmlFor="global-site-search">ابحث في الموقع</label>
            <input ref={inputRef} id="global-site-search" value={query} onChange={(event) => setQuery(event.target.value.slice(0, 100))} onKeyDown={onInputKeyDown} placeholder="نشاط، خدمة، قرية أو معلم…" autoComplete="off" inputMode="search" aria-controls="global-search-results" aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined} />
            {query ? <button type="button" className="global-search__clear" onClick={() => setQuery('')}>مسح</button> : null}
            <button type="submit" className="global-search__submit">ابحث</button>
          </form>
          <div className={`global-search__status${error ? ' is-error' : ''}`} aria-live="polite"><span>{status}</span>{canSearch && !loading && !error ? <small>Enter لعرض كل النتائج</small> : null}</div>
          <div id="global-search-results" className="global-search__results" role="listbox" aria-label="نتائج البحث السريع">
            {loading ? <div className="global-search__loading" aria-hidden="true"><span /><span /><span /></div> : items.length ? items.map((item, index) => (
              <button key={`${item.kind}-${item.href}`} id={`global-search-result-${index}`} type="button" role="option" aria-selected={activeIndex === index} className={`global-search__result${activeIndex === index ? ' is-active' : ''}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => navigate(item.href)}>
                <span className={`global-search__result-icon kind-${item.kind}`} aria-hidden="true">{resultGlyph(item.kind)}</span>
                <span className="global-search__result-copy"><span><strong>{item.title}</strong><i>{item.badge}</i></span><small>{item.subtitle}</small></span>
                <b aria-hidden="true">←</b>
              </button>
            )) : canSearch && !loading && !error ? <div className="global-search__empty"><span>⌕</span><strong>لا توجد نتيجة مباشرة</strong><small>اضغط Enter لإجراء بحث أوسع داخل الدليل.</small></div> : (
              <div className="global-search__suggestions"><span>اقتراحات سريعة</span><div><button type="button" onClick={() => setQuery('حضانة')}>حضانة</button><button type="button" onClick={() => setQuery('صيدلية')}>صيدلية</button><button type="button" onClick={() => setQuery('الخطارة')}>الخطارة</button><button type="button" onClick={() => setQuery('مطعم')}>مطعم</button></div></div>
            )}
          </div>
          <div className="global-search__footer"><span>بحث سريع في الأنشطة والأقسام والقرى والمعالم</span><button type="button" onClick={() => navigate('/directory')}>فتح الدليل كاملًا ←</button></div>
        </div>
      ) : null}
    </div>
  );
}
