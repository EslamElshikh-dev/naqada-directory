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
      <button className="button button--ghost" type="button" onClick={shareListing}>مشاركة السجل</button>
      <button className="button button--ghost" type="button" onClick={copyLink}>{copied ? 'تم نسخ الرابط ✓' : 'نسخ الرابط'}</button>
    </div>
  );
}
