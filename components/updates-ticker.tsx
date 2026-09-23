'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './updates-ticker.module.css';

type TickerItem = { href: string; tag: string; text: string };

const fallbackUpdates: TickerItem[] = [
  { href: '/news', tag: 'الأخبار', text: 'تابع أخبار نقادة وقنا من مصادرها الصحفية والرسمية' },
  { href: '/updates', tag: 'تحديث', text: 'مراجعة أحدث بيانات الأنشطة والخدمات داخل دليل نقادة' },
  { href: '/directory', tag: 'تصميم', text: 'تطوير بطاقات الدليل وتجربة التصفح على الجوال والكمبيوتر' },
  { href: '/knowledge', tag: 'الموسوعة', text: 'توسعة صفحات الأماكن والأعلام والتراث المحلي في مركز نقادة' },
  { href: '/search', tag: 'البحث', text: 'تحسين البحث الموحّد للوصول إلى النشاط أو القرية أو المعلومة بسرعة' },
  { href: '/contribute', tag: 'شاركنا', text: 'إضافة مسار واضح لإرسال نشاط أو تصحيح موثّق ومراجعته قبل النشر' },
  { href: '/updates', tag: 'سند', text: 'تطوير المساعد الذكي سند وتحسين وصوله السريع على الهاتف' },
];

export function UpdatesTicker() {
  const [paused, setPaused] = useState(false);
  const [liveItems, setLiveItems] = useState<TickerItem[]>([]);
  const tickerItems = liveItems.length ? liveItems : fallbackUpdates;

  useEffect(() => {
    const controller = new AbortController();
    const loadNews = () => {
      fetch('/api/news', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('News unavailable')))
      .then((payload: { items?: TickerItem[] }) => {
        if (Array.isArray(payload.items) && payload.items.length) setLiveItems(payload.items);
      })
      .catch(() => undefined);
    };
    // Let the visible page and its image finish first; abort on navigation/unmount.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(loadNews, 1800); };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => { window.removeEventListener('load', schedule); clearTimeout(timer); controller.abort(); };
  }, []);

  return (
    <section className={styles.root} data-paused={paused} dir="rtl" aria-label="آخر أخبار وتحديثات دليل نقادة">
      <Link prefetch={false} href="/news" className={styles.heading}>
        <i aria-hidden="true" />
        <span><small>نبض نقادة</small><strong>الأخبار الآن</strong></span>
      </Link>

      <div className={styles.viewport}>
        <div className={styles.track}>
          <div className={styles.group}>
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
              <span className={styles.item} key={`clone-${item.tag}-${item.href}-${item.text}`}>
                <span>{item.tag}</span>
                <strong>{item.text}</strong>
                <b aria-hidden="true">←</b>
              </span>
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
