'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics-client';
import styles from './home-smart-search.module.css';

type SearchItem = {
  kind: 'listing' | 'category' | 'locality' | 'landmark' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

type SearchResponse = { items?: SearchItem[]; error?: string };

type DiscoveryLink = {
  label: string;
  href: string;
};

type DiscoveryShortcut = DiscoveryLink & {
  type: 'service' | 'place';
};

const discoveryServices: DiscoveryLink[] = [
  { label: 'صيدليات', href: '/activities/صيدليات' },
  { label: 'أطباء وعيادات', href: '/activities/اطباء-وعيادات' },
  { label: 'مدارس ومعاهد', href: '/activities/مدارس-ومعاهد' },
  { label: 'مطاعم ومقاهي', href: '/activities/مطاعم-ومقاهي' },
  { label: 'معامل تحاليل', href: '/activities/معامل-تحاليل' },
  { label: 'موبايلات وكمبيوتر', href: '/activities/محلات-موبايلات-وكمبيوتر' },
];

const discoveryPlaces: DiscoveryLink[] = [
  { label: 'مدينة نقادة', href: '/villages/مدينه-نقاده' },
  { label: 'بشلاو', href: '/villages/بشلاو' },
  { label: 'الأوسط قمولا', href: '/villages/الاوسط-قمولا' },
  { label: 'طوخ', href: '/villages/طوخ' },
  { label: 'الخطارة', href: '/villages/الخطاره' },
  { label: 'دنفيق', href: '/villages/دنفيق' },
];

const oneClickShortcuts: DiscoveryShortcut[] = [
  { label: 'صيدليات', href: '/activities/صيدليات', type: 'service' },
  { label: 'أطباء', href: '/activities/اطباء-وعيادات', type: 'service' },
  { label: 'مطاعم', href: '/activities/مطاعم-ومقاهي', type: 'service' },
  { label: 'بشلاو', href: '/villages/بشلاو', type: 'place' },
  { label: 'الأوسط قمولا', href: '/villages/الاوسط-قمولا', type: 'place' },
  { label: 'مدينة نقادة', href: '/villages/مدينه-نقاده', type: 'place' },
];

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

  function handleDiscoveryShortcut(type: 'service' | 'place' | 'index', label: string) {
    setOpen(false);
    trackEvent('Home Discovery Shortcut', { type, label });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedQuery) {
      setOpen(true);
      return;
    }
    if (activeIndex >= 0 && items[activeIndex]) navigate(items[activeIndex].href);
    else navigate(`/directory?q=${encodeURIComponent(trimmedQuery)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!canSearch || !items.length) return;
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

  const showPanel = open;

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
          role="combobox"
          value={query}
          onChange={(event) => { setQuery(event.target.value.slice(0, 100)); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث باسم خدمة أو نشاط أو قرية…"
          autoComplete="off"
          inputMode="search"
          aria-expanded={showPanel}
          aria-haspopup={canSearch ? 'listbox' : undefined}
          aria-controls="home-smart-search-results"
          aria-activedescendant={canSearch && activeIndex >= 0 ? `home-search-result-${activeIndex}` : undefined}
          aria-autocomplete={canSearch ? 'list' : undefined}
        />
        {query ? <button type="button" className={styles.clear} onClick={() => { setQuery(''); setOpen(true); }}>مسح</button> : null}
        <button type="submit">ابحث في الدليل <b aria-hidden="true">←</b></button>
      </form>

      <nav className={styles.shortcutRail} aria-label="اختصارات مباشرة من الصفحة الرئيسية">
        <span>الأكثر طلبًا</span>
        <div>
          {oneClickShortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              data-type={item.type}
              onClick={() => handleDiscoveryShortcut(item.type, item.label)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {showPanel ? (
        <div
          id="home-smart-search-results"
          className={styles.panel}
          role={canSearch ? 'listbox' : undefined}
          aria-label={canSearch ? 'نتائج البحث المقترحة' : 'وصول مباشر للخدمات والقرى'}
          aria-busy={canSearch ? loading : undefined}
        >
          {canSearch ? (
            <>
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
            </>
          ) : (
            <div className={styles.discovery}>
              <div className={styles.discoveryIntro}>
                <div><span>{trimmedQuery ? 'اكتب حرفًا آخر للبحث الذكي' : 'ابدأ مباشرة بدون كتابة'}</span><strong>اختر خدمة أو قرية ووصل لها بضغطة واحدة</strong></div>
                <span className={styles.discoveryBadge}>Discovery V3</span>
              </div>

              <div className={styles.discoveryColumns}>
                <section className={styles.discoveryGroup} aria-label="خدمات سريعة">
                  <div className={styles.discoveryGroupHead}><strong>خدمات شائعة</strong><Link href="/activities" prefetch={false} onClick={() => handleDiscoveryShortcut('index', 'كل الخدمات')}>كل الخدمات ←</Link></div>
                  <div className={styles.discoveryLinks}>
                    {discoveryServices.map((item) => <Link key={item.href} href={item.href} prefetch={false} className={styles.discoveryLink} data-type="service" onClick={() => handleDiscoveryShortcut('service', item.label)}>{item.label}</Link>)}
                  </div>
                </section>

                <section className={styles.discoveryGroup} aria-label="قرى سريعة">
                  <div className={styles.discoveryGroupHead}><strong>أماكن مباشرة</strong><Link href="/villages" prefetch={false} onClick={() => handleDiscoveryShortcut('index', 'كل القرى')}>كل القرى ←</Link></div>
                  <div className={styles.discoveryLinks}>
                    {discoveryPlaces.map((item) => <Link key={item.href} href={item.href} prefetch={false} className={styles.discoveryLink} data-type="place" onClick={() => handleDiscoveryShortcut('place', item.label)}>{item.label}</Link>)}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
