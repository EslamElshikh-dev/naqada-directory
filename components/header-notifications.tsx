'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './header-notifications.module.css';

const notificationItems = [
  {
    href: '/updates',
    label: 'بيانات جديدة',
    title: 'راجعنا أحدث بيانات الأنشطة',
    detail: 'شاهد آخر المعلومات التي تم تدقيقها وتحديثها داخل الدليل.',
    tone: 'mint',
  },
  {
    href: '/knowledge',
    label: 'من الموسوعة',
    title: 'اكتشف نقادة من مصادرها',
    detail: 'ملفات مرتبة عن الأماكن والأعلام والتراث المحلي.',
    tone: 'gold',
  },
  {
    href: '/contribute',
    label: 'شاركنا',
    title: 'عندك معلومة أحدث؟',
    detail: 'أرسل التصحيح ومصدره لنراجعه قبل إضافته إلى الدليل.',
    tone: 'coral',
  },
] as const;

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9Z" />
      <path d="M9.7 20h4.6" />
    </svg>
  );
}

export function HeaderNotifications() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function togglePanel() {
    setOpen((value) => !value);
    setHasUnread(false);
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="عرض أهم الإشعارات"
        aria-expanded={open}
        aria-controls="header-notifications-panel"
        onClick={togglePanel}
      >
        <BellIcon />
        {hasUnread ? <span className={styles.unread} aria-label="إشعارات جديدة">٣</span> : null}
      </button>

      {open ? (
        <section id="header-notifications-panel" className={styles.panel} role="dialog" aria-labelledby="header-notifications-title">
          <header className={styles.head}>
            <span className={styles.headIcon}><BellIcon /></span>
            <div>
              <small>مركز التنبيهات</small>
              <strong id="header-notifications-title">أهم الإشعارات</strong>
              <p>مختارات قصيرة تساعدك تبدأ من المكان الصح.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق الإشعارات">×</button>
          </header>

          <div className={styles.list}>
            {notificationItems.map((item, index) => (
              <Link key={item.href} href={item.href} className={styles.item} data-tone={item.tone} onClick={() => setOpen(false)}>
                <span className={styles.marker}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.copy}>
                  <small>{item.label}</small>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </span>
                <span className={styles.arrow} aria-hidden="true">←</span>
              </Link>
            ))}
          </div>

          <footer className={styles.footer}>
            <span><i /> كل التنبيهات من داخل دليل نقادة</span>
            <Link href="/updates" onClick={() => setOpen(false)}>سجل التحديثات</Link>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
