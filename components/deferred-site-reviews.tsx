'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import styles from '@/app/home.module.css';

const SiteReviews = dynamic(() => import('./site-reviews').then((module) => module.SiteReviews), {
  loading: () => <p role="status">جارٍ تحميل التقييمات…</p>,
});

export function DeferredSiteReviews() {
  const [loaded, setLoaded] = useState(false);
  return (
    <details className={styles.reviewReveal} onToggle={(event) => {
      if (event.currentTarget.open) setLoaded(true);
    }}>
      <summary><span><small>مساحة المجتمع</small><strong>شاركنا رأيك في الدليل</strong></span><b>فتح التقييمات ↓</b></summary>
      {loaded && <SiteReviews />}
    </details>
  );
}
