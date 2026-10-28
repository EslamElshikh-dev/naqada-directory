'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import styles from '@/app/home.module.css';
import { ensureWidgetStyles } from '@/lib/widget-styles';

const SiteReviews = dynamic(() => import('./site-reviews').then((module) => module.SiteReviews), {
  loading: () => <p role="status">جارٍ تحميل التقييمات…</p>,
});

export function DeferredSiteReviews() {
  const [loaded, setLoaded] = useState(false);
  return (
    <details className={styles.reviewReveal} onToggle={async (event) => {
      if (event.currentTarget.open) {
        try { await ensureWidgetStyles('reviews'); setLoaded(true); }
        catch { window.alert('تعذّر تحميل التقييمات. تحقّق من الاتصال وحاول مرة أخرى.'); }
      }
    }}>
      <summary><span><small>مساحة المجتمع</small><strong>شاركنا رأيك في الدليل</strong></span><b>فتح التقييمات ↓</b></summary>
      {loaded && <SiteReviews />}
    </details>
  );
}
