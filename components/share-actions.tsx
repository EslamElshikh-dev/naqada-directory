'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';

export function ShareActions({ title, locality, listingSlug }: { title: string; locality: string; listingSlug: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      trackEvent('Listing Link Copied', { locality, listingSlug });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function shareListing() {
    const text = `${title} — ${locality} | دليل نقادة`;
    if (navigator.share) {
      await navigator.share({ title, text, url: window.location.href });
      trackEvent('Listing Shared', { locality, listingSlug, method: 'native' });
      return;
    }
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text}\n${window.location.href}`)}`;
    window.open(whatsapp, '_blank', 'noopener,noreferrer');
    trackEvent('Listing Shared', { locality, listingSlug, method: 'whatsapp' });
  }

  return (
    <div className="detail-actions" style={{ marginTop: 18 }}>
      <button className="button button--ghost" type="button" onClick={shareListing}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg><span>مشاركة النشاط</span></button>
      <button className="button button--ghost" type="button" onClick={copyLink}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>{copied ? 'تم النسخ ✓' : 'نسخ الرابط'}</span></button>
    </div>
  );
}
