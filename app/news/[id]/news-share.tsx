'use client';

import { useState } from 'react';
import styles from './story.module.css';

export function NewsShare({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* User cancelled or app does not support sharing. */ }
    }
    await navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {});
  };
  return <div className={styles.shareCard} aria-label="شارك الخبر">
    <div><strong>شارك الخبر بصورته</strong><span>رابط ثابت من دليل نقادة يظهر معه عنوان الخبر وصورته واسم مصدره.</span></div>
    <button type="button" onClick={share}>{copied ? 'تم نسخ الرابط ✓' : 'مشاركة أو نسخ الرابط ↗'}</button>
    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">فيسبوك ↗</a>
  </div>;
}
