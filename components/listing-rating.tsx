'use client';

import { useEffect, useState } from 'react';
import { getListingRating, submitListingRating, type RatingSummary } from '@/lib/analytics-client';

const scores = [1, 2, 3, 4, 5];

export function ListingRating({ listingSlug, listingName }: { listingSlug: string; listingName: string }) {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void getListingRating(listingSlug).then((result) => {
      if (!active) return;
      setSummary(result);
      try {
        const saved = Number(window.localStorage.getItem(`naqada-rating:${listingSlug}`));
        if (scores.includes(saved)) setSelected(saved);
      } catch {
        // Storage is optional; the server remains the source of truth.
      }
    });
    return () => { active = false; };
  }, [listingSlug]);

  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setMessage('');
    const result = await submitListingRating(listingSlug, selected);
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.status === 429 ? 'تم بلوغ الحد المؤقت للمحاولات. جرّب لاحقًا.' : 'تعذر حفظ التقييم الآن. حاول مرة أخرى.');
      return;
    }

    if (result.summary) setSummary(result.summary);
    try {
      window.localStorage.setItem(`naqada-rating:${listingSlug}`, String(selected));
    } catch {
      // The successful server response is sufficient.
    }
    setMessage('شكرًا، تم حفظ تقييمك ويمكنك تعديله في أي وقت.');
  }

  return (
    <section className="listing-rating" aria-labelledby="listing-rating-title">
      <div className="listing-rating__copy">
        <span className="eyebrow eyebrow--dark">تجربة الزوار</span>
        <h2 id="listing-rating-title">قيّم {listingName}</h2>
        <p>شارك تقييمك لمساعدة أهالي نقادة في الوصول إلى الخدمة المناسبة.</p>
      </div>
      <div className="listing-rating__summary" aria-live="polite">
        <strong>{summary?.count ? summary.average.toLocaleString('ar-EG', { maximumFractionDigits: 1 }) : '—'}</strong>
        <span>{summary?.count ? `من 5 · ${summary.count.toLocaleString('ar-EG')} تقييم` : 'لا توجد تقييمات بعد'}</span>
      </div>
      <div className="listing-rating__form">
        <div className="listing-rating__stars" role="group" aria-label="اختر تقييمًا من خمس نجوم">
          {scores.map((score) => <button
            key={score}
            type="button"
            className={score <= selected ? 'is-selected' : ''}
            aria-pressed={score === selected}
            aria-label={`${score} من 5`}
            onClick={() => { setSelected(score); setMessage(''); }}
          >★</button>)}
        </div>
        <button className="button button--primary" type="button" disabled={!selected || submitting} onClick={submit}>
          {submitting ? 'جارٍ الحفظ…' : selected ? `إرسال تقييم ${selected.toLocaleString('ar-EG')}/5` : 'اختر عدد النجوم'}
        </button>
      </div>
      {message && <p className="listing-rating__message" role="status">{message}</p>}
    </section>
  );
}
