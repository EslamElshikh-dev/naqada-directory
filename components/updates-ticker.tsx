'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './updates-ticker.module.css';
import { MAX_JOB_HEADLINES } from '@/lib/job-headlines';

type TickerItem = { href: string; tag: string; text: string };

const TICKER_PIXELS_PER_SECOND = 24;
const TICKER_START_DELAY_MS = 1000;

const fallbackUpdates: TickerItem[] = [
  { href: '/jobs', tag: 'فرص البلد', text: 'عندك وظيفة أو بتدور على شغل؟ باب الرزق من هنا' },
  { href: '/news', tag: 'الأخبار', text: 'تابع أخبار نقادة وقنا من مصادرها الصحفية والرسمية' },
  { href: '/updates', tag: 'تحديث', text: 'مراجعة أحدث بيانات الأنشطة والخدمات داخل دليل نقادة' },
  { href: '/directory', tag: 'تصميم', text: 'تطوير بطاقات الدليل وتجربة التصفح على الجوال والكمبيوتر' },
  { href: '/knowledge', tag: 'الموسوعة', text: 'توسعة صفحات الأماكن والأعلام والتراث المحلي في مركز نقادة' },
  { href: '/search', tag: 'البحث', text: 'تحسين البحث الموحّد للوصول إلى النشاط أو القرية أو المعلومة بسرعة' },
  { href: '/contribute', tag: 'شاركنا', text: 'إضافة مسار واضح لإرسال نشاط أو تصحيح موثّق ومراجعته قبل النشر' },
  { href: '/updates', tag: 'سند', text: 'تطوير المساعد الذكي سند وتحسين وصوله السريع على الهاتف' },
];

export function UpdatesTicker({ initialPaused = false }: { initialPaused?: boolean }) {
  const [paused, setPaused] = useState(initialPaused);
  const [liveItems, setLiveItems] = useState<TickerItem[]>([]);
  const [feedLoaded, setFeedLoaded] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const pendingItems = useRef<TickerItem[] | null>(null);
  const tickerItems = liveItems.length ? liveItems : fallbackUpdates;

  useEffect(() => {
    const controller = new AbortController();
    let initialLoad = true;
    const loadUpdates = async () => {
      const request = new AbortController();
      const abortRequest = () => request.abort();
      controller.signal.addEventListener('abort', abortRequest, { once: true });
      const timeout = setTimeout(abortRequest, 6000);
      const results = await Promise.allSettled(['/api/jobs', '/api/news'].map(async (url) => {
        const response = await fetch(url, { signal: request.signal });
        if (!response.ok) throw new Error('Feed unavailable');
        return response.json() as Promise<{ items?: TickerItem[] }>;
      }));
      clearTimeout(timeout);
      controller.signal.removeEventListener('abort', abortRequest);
      if (controller.signal.aborted) return;
      const [jobResult, newsResult] = results;
      const jobItems = jobResult.status === 'fulfilled' && Array.isArray(jobResult.value.items) ? jobResult.value.items.slice(0, MAX_JOB_HEADLINES) : [];
      const newsItems = newsResult.status === 'fulfilled' && Array.isArray(newsResult.value.items) ? newsResult.value.items.slice(0, 6) : [];
      const items = jobItems.length || newsItems.length
        ? [...jobItems, ...newsItems, fallbackUpdates[2], ...(!jobItems.length ? [fallbackUpdates[0]] : [])]
        : fallbackUpdates;
      if (initialLoad || !trackRef.current?.getAnimations().length) {
        initialLoad = false;
        setLiveItems(items);
        setFeedLoaded(true);
      } else {
        // Replace refreshed headlines at the loop boundary, never mid-sentence.
        pendingItems.current = items;
      }
    };
    // Let the visible page and its image finish first; abort on navigation/unmount.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(loadUpdates, 1800); };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    const interval = setInterval(loadUpdates, 30 * 60 * 1000);
    return () => { window.removeEventListener('load', schedule); clearTimeout(timer); clearInterval(interval); controller.abort(); };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    const viewport = track?.parentElement;
    if (!feedLoaded || !track || !group || !viewport) return;

    let cancelled = false;
    let distance = 0;
    const measure = () => {
      const nextDistance = group.getBoundingClientRect().width;
      if (!nextDistance || Math.abs(nextDistance - distance) < .5) return;
      const animation = track.getAnimations()[0];
      const currentX = animation ? new DOMMatrixReadOnly(getComputedStyle(track).transform).m41 : 0;
      const inStartDelay = animation && Number(animation.currentTime) < TICKER_START_DELAY_MS;
      track.style.setProperty('--ticker-duration', `${nextDistance / TICKER_PIXELS_PER_SECOND}s`);
      track.dataset.ready = 'true';
      if (animation && !inStartDelay) {
        // Keep the visible text in place when the viewport or its font size changes.
        const startX = viewport.getBoundingClientRect().width - 2 * nextDistance;
        const offset = ((currentX - startX) % nextDistance + nextDistance) % nextDistance;
        animation.currentTime = TICKER_START_DELAY_MS + offset / TICKER_PIXELS_PER_SECOND * 1000;
      }
      distance = nextDistance;
    };
    const observer = new ResizeObserver(measure);
    // The first animation frame uses the final feed width and loaded Arabic font.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      measure();
      observer.observe(group);
      observer.observe(viewport);
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      delete track.dataset.ready;
    };
  }, [feedLoaded, tickerItems]);

  const applyPendingItems = () => {
    if (!pendingItems.current) return;
    setLiveItems(pendingItems.current);
    pendingItems.current = null;
  };

  return (
    <section className={styles.root} data-paused={paused} dir="rtl" aria-label="آخر أخبار وتحديثات دليل نقادة">
      <Link prefetch={false} href="/news" className={styles.heading}>
        <i aria-hidden="true" />
        <span><small>نبض نقادة</small><strong>الأخبار الآن</strong></span>
      </Link>

      <div className={styles.viewport}>
        <div className={styles.track} ref={trackRef} onAnimationIteration={applyPendingItems}>
          <div className={styles.group} ref={groupRef}>
            {tickerItems.map((item) => (
              <Link prefetch={false} className={styles.item} href={item.href} key={`${item.tag}-${item.href}-${item.text}`}>
                <span>{item.tag}</span>
                <strong>{item.text}</strong>
                <b aria-hidden="true">←</b>
              </Link>
            ))}
          </div>
          <div className={`${styles.group} ${styles.clone}`} aria-hidden="true">
            {tickerItems.map((item) => (
              <Link prefetch={false} tabIndex={-1} className={styles.item} href={item.href} key={`clone-${item.tag}-${item.href}-${item.text}`}>
                <span>{item.tag}</span>
                <strong>{item.text}</strong>
                <b aria-hidden="true">←</b>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.control}
        aria-pressed={paused}
        aria-label={paused ? 'استئناف حركة شريط الأخبار' : 'إيقاف حركة شريط الأخبار'}
        onClick={() => setPaused((value) => !value)}
      >
        <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
      </button>
    </section>
  );
}
