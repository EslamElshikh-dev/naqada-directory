'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './updates-ticker.module.css';

const siteUpdates = [
  { href: '/updates', tag: 'تحديث', text: 'مراجعة أحدث بيانات الأنشطة والخدمات داخل دليل نقادة' },
  { href: '/directory', tag: 'تصميم', text: 'تطوير بطاقات الدليل وتجربة التصفح على الجوال والكمبيوتر' },
  { href: '/knowledge', tag: 'الموسوعة', text: 'توسعة صفحات الأماكن والأعلام والتراث المحلي في مركز نقادة' },
  { href: '/search', tag: 'البحث', text: 'تحسين البحث الموحّد للوصول إلى النشاط أو القرية أو المعلومة بسرعة' },
  { href: '/contribute', tag: 'شاركنا', text: 'إضافة مسار واضح لإرسال نشاط أو تصحيح موثّق ومراجعته قبل النشر' },
  { href: '/updates', tag: 'سند', text: 'تطوير المساعد الذكي سند وتحسين وصوله السريع على الهاتف' },
] as const;

export function UpdatesTicker() {
  const [paused, setPaused] = useState(false);

  return (
    <section className={styles.root} data-paused={paused} aria-label="آخر تحديثات دليل نقادة">
      <Link href="/updates" className={styles.heading}>
        <i aria-hidden="true" />
        <span><small>نبض الدليل</small><strong>آخر التحديثات</strong></span>
      </Link>

      <div className={styles.viewport}>
        <div className={styles.track}>
          <div className={styles.group}>
            {siteUpdates.map((item) => (
              <Link className={styles.item} href={item.href} key={`${item.tag}-${item.href}`}>
                <span>{item.tag}</span>
                <strong>{item.text}</strong>
                <b aria-hidden="true">←</b>
              </Link>
            ))}
          </div>
          <div className={`${styles.group} ${styles.clone}`} aria-hidden="true">
            {siteUpdates.map((item) => (
              <span className={styles.item} key={`clone-${item.tag}-${item.href}`}>
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
        aria-label={paused ? 'استئناف حركة شريط التحديثات' : 'إيقاف حركة شريط التحديثات'}
        onClick={() => setPaused((value) => !value)}
      >
        <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
      </button>
    </section>
  );
}
