'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DirectoryNotice } from '@/lib/notifications';
import { ensureClientSession, subscribeClientSession } from './auth/client-session';
import { InstallBanner } from './pwa-setup';
import styles from './header-notifications.module.css';

const WELCOME_ID = 'welcome-salawat-v1';
const WELCOME_KEY = 'naqada_notification_welcome_v1';
const SEEN_KEY = 'naqada_seen_notices_v1';
const PERSONAL_SEEN_KEY = 'naqada_seen_personal_notices_v1:';
const SALAWAT = 'اللهم صل وسلم وزد وبارك علي سيدنا محمد';

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
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [greetingInPanel, setGreetingInPanel] = useState(false);
  const [items, setItems] = useState<DirectoryNotice[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [personalItems, setPersonalItems] = useState<DirectoryNotice[]>([]);
  const [personalEnabled, setPersonalEnabled] = useState(false);
  const [personalSeen, setPersonalSeen] = useState<string[]>([]);
  const viewerRef = useRef<string | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([WELCOME_ID]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      try {
        const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as unknown;
        setSeenIds(Array.isArray(seen) ? seen.filter((id): id is string => typeof id === 'string').slice(-100) : []);
        if (!localStorage.getItem(WELCOME_KEY)) {
          localStorage.setItem(WELCOME_KEY, '1');
          setWelcomeVisible(true);
        }
      } catch { setWelcomeVisible(true); setSeenIds([]); }
      setLoaded(true);
    }, 0);

    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/notifications/', { cache: 'no-cache' });
        if (!response.ok) return;
        const data = await response.json() as { items?: DirectoryNotice[] };
        if (active && Array.isArray(data.items)) setItems(data.items);
      } catch { /* Keep the real feed empty when it cannot be reached. */ }
    };
    void load();
    const interval = window.setInterval(load, 15 * 60 * 1000);
    return () => { active = false; window.clearTimeout(hydrate); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeClientSession((user) => {
      if (user === undefined) return;
      const id = user?.id || null;
      if (viewerRef.current === id) return;
      viewerRef.current = id;
      setViewerId(id);
      setPersonalItems([]);
      setPersonalEnabled(false);
      try {
        const seen = JSON.parse(localStorage.getItem(`${PERSONAL_SEEN_KEY}${id}`) || '[]') as unknown;
        setPersonalSeen(id && Array.isArray(seen) ? seen.filter((item): item is string => typeof item === 'string').slice(-100) : []);
      } catch { setPersonalSeen([]); }
    });
    void ensureClientSession();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!viewerId) return;
    let active = true;
    let forbidden = false;
    const load = async () => {
      if (forbidden || document.hidden) return;
      try {
        const response = await fetch('/api/notifications/personal/', { cache: 'no-store', credentials: 'same-origin' });
        if (response.status === 403) { forbidden = true; return; }
        if (!response.ok) return;
        const data = await response.json() as { items?: DirectoryNotice[] };
        if (active && viewerRef.current === viewerId && Array.isArray(data.items)) { setPersonalEnabled(true); setPersonalItems(data.items); }
      } catch { /* Keep the last successfully loaded account feed. */ }
    };
    void load();
    const interval = window.setInterval(load, 60_000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [viewerId]);

  useEffect(() => {
    if (!welcomeVisible) return;
    const timeout = window.setTimeout(() => setWelcomeVisible(false), 9000);
    return () => window.clearTimeout(timeout);
  }, [welcomeVisible]);

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

  useEffect(() => {
    if (!open || !viewerId || !personalItems.some((item) => !personalSeen.includes(item.id))) return;
    const next = [...new Set([...personalSeen, ...personalItems.map((item) => item.id)])].slice(-100);
    const timer = window.setTimeout(() => {
      setPersonalSeen(next);
      try { localStorage.setItem(`${PERSONAL_SEEN_KEY}${viewerId}`, JSON.stringify(next)); } catch { /* In-memory read state still works. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, viewerId, personalItems, personalSeen]);

  const unreadCount = loaded ? Number(!seenIds.includes(WELCOME_ID)) + items.filter((item) => !seenIds.includes(item.id)).length + personalItems.filter((item) => !personalSeen.includes(item.id)).length : 0;

  function markRead() {
    const next = [...new Set([...seenIds, WELCOME_ID, ...items.map((item) => item.id)])].slice(-100);
    setSeenIds(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* In-memory read state still works. */ }
    if (viewerId) {
      const personalNext = [...new Set([...personalSeen, ...personalItems.map((item) => item.id)])].slice(-100);
      setPersonalSeen(personalNext);
      try { localStorage.setItem(`${PERSONAL_SEEN_KEY}${viewerId}`, JSON.stringify(personalNext)); } catch { /* In-memory read state still works. */ }
    }
  }

  function togglePanel() {
    if (!open) {
      setGreetingInPanel(!seenIds.includes(WELCOME_ID));
      markRead();
      setWelcomeVisible(false);
    } else {
      setGreetingInPanel(false);
    }
    setOpen((value) => !value);
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button type="button" className={styles.trigger} aria-label={unreadCount ? `عرض الإشعارات، ${unreadCount} جديدة` : 'عرض الإشعارات'} aria-expanded={open} aria-controls="header-notifications-panel" onClick={togglePanel}>
        <BellIcon />
        {unreadCount ? <span className={styles.unread}>{unreadCount > 9 ? '٩+' : unreadCount.toLocaleString('ar-EG')}</span> : null}
      </button>

      {welcomeVisible && !open ? <div className={styles.welcome} role="status">
        <span aria-hidden="true">✦</span><div><small>نورت دليل نقادة</small><strong>{SALAWAT}</strong></div>
        <button type="button" aria-label="إغلاق رسالة الترحيب" onClick={() => setWelcomeVisible(false)}>×</button>
      </div> : null}

      {!open ? <InstallBanner welcomeVisible={welcomeVisible || !loaded} /> : null}

      {open ? <section id="header-notifications-panel" className={styles.panel} role="dialog" aria-labelledby="header-notifications-title">
        <header className={styles.head}>
          <span className={styles.headIcon}><BellIcon /></span>
          <div><small>تنبيهات الدليل</small><strong id="header-notifications-title">إشعاراتك</strong><p>{personalEnabled ? 'طلبات الإشراف الخاصة بحسابك وآخر أخبار الدليل.' : 'آخر أخبار الدليل وتحديثاته المنشورة.'}</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق الإشعارات">×</button>
        </header>

        <div className={styles.list}>
          {greetingInPanel ? <div className={styles.item} data-tone="gold">
            <span className={styles.marker} aria-hidden="true">✦</span>
            <span className={styles.copy}><small>تحية أول زيارة</small><strong>{SALAWAT}</strong><p>نورت بلدك ودليلك.</p></span>
          </div> : null}
          {personalEnabled ? <div className={styles.personalHeading}><span>✦ لكِ يا آية</span><small>طلبات ومتابعات مساحة الإشراف</small></div> : null}
          {personalItems.map((item) => (
            <Link key={item.id} href={item.href} className={styles.item} data-tone={item.tone} onClick={() => setOpen(false)}>
              <span className={styles.marker} aria-hidden="true">✦</span>
              <span className={styles.copy}><small>{item.label}</small><strong>{item.title}</strong><p>{item.detail}</p></span>
              <span className={styles.arrow} aria-hidden="true">←</span>
            </Link>
          ))}
          {personalEnabled && !personalItems.length ? <p className={styles.empty}>لا توجد طلبات مراجعة جديدة الآن. <Link href="/moderator/" onClick={() => setOpen(false)}>افتحي مساحة الإشراف</Link></p> : null}
          {personalEnabled ? <div className={styles.personalHeading}><span>من الدليل</span><small>أخبار منشورة للجميع</small></div> : null}
          {items.map((item) => (
            <Link key={item.id} href={item.href} className={styles.item} data-tone={item.tone} onClick={() => setOpen(false)}>
              <span className={styles.marker} aria-hidden="true">•</span>
              <span className={styles.copy}><small>{item.label}</small><strong>{item.title}</strong><p>{item.detail}</p></span>
              <span className={styles.arrow} aria-hidden="true">←</span>
            </Link>
          ))}
          {items.length === 0 && !personalEnabled ? <p className={styles.empty}>لا توجد تنبيهات جديدة الآن. ستظهر تحديثات الدليل هنا أولًا بأول.</p> : null}
        </div>

        <footer className={styles.footer}><span><i /> التنبيهات من محتوى الدليل الفعلي</span><Link href="/updates" onClick={() => setOpen(false)}>سجل التحديثات</Link></footer>
      </section> : null}
    </div>
  );
}
