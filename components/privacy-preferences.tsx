'use client';
import { useEffect } from 'react';
import { setMarketingConsent, useMarketingConsent } from '@/lib/marketing-consent';
export function PrivacyPreferences({ initialChoice }: { initialChoice?: 'granted' | 'denied' }) {
  useEffect(() => { if (initialChoice) setMarketingConsent(initialChoice); }, [initialChoice]);
  const choice = useMarketingConsent();
  return <section className="privacy-preferences" aria-labelledby="marketing-choice-title">
    <h2 id="marketing-choice-title">تفضيلات قياس الإعلانات</h2>
    <p>نحمّل Meta Pixel بعد موافقتك لقياس زيارات الحملات. يمكنك تغيير الاختيار هنا في أي وقت.</p>
    <div className="detail-actions">
      <button type="button" className="button button--ghost" aria-pressed={choice === 'granted'} onClick={() => setMarketingConsent('granted')}>السماح بقياس Meta</button>
      <button type="button" className="button button--ghost" aria-pressed={choice === 'denied'} onClick={() => setMarketingConsent('denied')}>رفض القياس</button>
      <span role="status">{choice === 'granted' ? 'قياس Meta مسموح' : choice === 'denied' ? 'قياس Meta متوقف' : 'لم تختر بعد؛ قياس Meta متوقف'}</span>
    </div>
  </section>;
}
