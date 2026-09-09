'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './home-smart-search.module.css';

type SearchItem = {
  kind: 'listing' | 'category' | 'locality' | 'landmark' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

type SearchResponse = { items?: SearchItem[]; error?: string };

function resultGlyph(kind: SearchItem['kind']) {
  if (kind === 'listing') return '⌖';
  if (kind === 'category') return '▦';
  if (kind === 'locality') return '⌂';
  if (kind === 'landmark') return '◇';
  return '↗';
}

export function HomeSmartSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!canSearch) {
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
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({})) as SearchResponse;
        if (!response.ok) throw new Error(payload.error || 'تعذر تنفيذ البحث الآن.');
        setItems(Array.isArray(payload.items) ? payload.items.slice(0, 5) : []);
        setActiveIndex(-1);
        setOpen(true);
      } catch (cause) {
        if ((cause as Error)?.name === 'AbortError') return;
        setItems([]);
        setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ البحث الآن.');
        setOpen(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [canSearch, trimmedQuery]);

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

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((value) => value >= items.length - 1 ? 0 : value + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((value) => value <= 0 ? items.length - 1 : value - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    }
  }

  const showPanel = open && canSearch;

  return (
    <div ref={rootRef} className={styles.root}>
      <form className={`hero-search ${styles.form}`} role="search" onSubmit={submit}>
        <span className="hero-search__brand" aria-hidden="true">
          <Image src="/icon.svg" width={30} height={30} alt="" />
        </span>
        <label className="sr-only" htmlFor="home-search">ابحث في دليل نقادة</label>
        <input
          id="home-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, 100))}
          onFocus={() => canSearch && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث باسم خدمة أو نشاط أو قرية…"
          autoComplete="off"
          inputMode="search"
          aria-expanded={showPanel}
          aria-controls="home-smart-search-results"
          aria-activedescendant={activeIndex >= 0 ? `home-search-result-${activeIndex}` : undefined}
          aria-autocomplete="list"
        />
        {query ? <button type="button" className={styles.clear} onClick={() => { setQuery(''); setOpen(false); }}>مسح</button> : null}
        <button type="submit">ابحث في الدليل <b aria-hidden="true">←</b></button>
      </form>

      {showPanel ? (
        <div id="home-smart-search-results" className={styles.panel} role="listbox" aria-label="نتائج البحث المقترحة" aria-busy={loading}>
          <div className={styles.panelHead}>
            <span>{loading ? 'جارٍ البحث…' : error ? 'تعذر البحث السريع' : items.length ? `${items.length.toLocaleString('ar-EG')} اقتراحات مباشرة` : 'لا توجد نتيجة مباشرة'}</span>
            <button type="button" onClick={() => navigate(`/directory?q=${encodeURIComponent(trimmedQuery)}`)}>كل النتائج ←</button>
          </div>

          {loading ? (
            <div className={styles.loading} aria-hidden="true"><span /><span /><span /></div>
          ) : error ? (
            <div className={styles.empty}><strong>البحث السريع غير متاح الآن</strong><span>يمكنك متابعة البحث الموسّع داخل الدليل.</span></div>
          ) : items.length ? (
            <div className={styles.results}>
              {items.map((item, index) => (
                <button
                  key={`${item.kind}-${item.href}`}
                  id={`home-search-result-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`${styles.result}${activeIndex === index ? ` ${styles.active}` : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigate(item.href)}
                >
                  <span className={styles.icon} aria-hidden="true">{resultGlyph(item.kind)}</span>
                  <span className={styles.copy}><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                  <i>{item.badge}</i>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.empty}><strong>جرّب عبارة أقصر أو مختلفة</strong><span>أو افتح البحث الموسّع لعرض كل ما يطابق عبارتك.</span></div>
          )}

          <button type="button" className={styles.expanded} onClick={() => navigate(`/directory?q=${encodeURIComponent(trimmedQuery)}`)}>
            البحث الموسّع عن «{trimmedQuery}»
            <span aria-hidden="true">←</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
