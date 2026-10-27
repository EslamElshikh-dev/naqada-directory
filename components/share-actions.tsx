'use client';
import { useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { siteConfig } from '@/lib/site';
export function ShareActions({ title, locality = '', listingSlug = '', url, scope = 'listing' }: { title: string; locality?: string; listingSlug?: string; url?: string; scope?: 'listing' | 'content' }) {
  const [status, setStatus] = useState('');
  const canonical = (url || siteConfig.url + '/listing/' + encodeURIComponent(listingSlug) + '/').replace(/\/?$/, '/');
  const text = title + (locality ? ' — ' + locality : '') + ' | دليل نقادة';
  const tracked = (method: string) => { if (scope === 'listing' && listingSlug) trackEvent('Listing Shared', { locality, listingSlug, method }); };
  async function copy() {
    try { await navigator.clipboard.writeText(canonical); setStatus('تم النسخ ✓'); tracked('copy'); }
    catch { setStatus('تعذّر نسخ الرابط. استخدم زر واتساب.'); }
  }
  async function share() {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title, text, url: canonical }); tracked('native'); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setStatus('تعذّرت المشاركة. جرّب نسخ الرابط.'); }
  }
  return <div className="detail-actions" style={{ marginTop: 18 }}>
    <button className="button button--ghost" type="button" onClick={share}>مشاركة {scope === 'listing' ? 'النشاط' : 'الصفحة'}</button>
    <button className="button button--ghost" type="button" onClick={copy}>نسخ الرابط</button>
    <a className="button button--ghost" href={'https://wa.me/?text=' + encodeURIComponent(text + '\n' + canonical)} target="_blank" rel="noopener noreferrer" onClick={() => tracked('whatsapp')}>واتساب</a>
    <span role="status" aria-live="polite">{status}</span>
  </div>;
}
