'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type Review = { id: string; rating: number; body: string; authorName: string; createdAt: string; updatedAt: string; own: boolean };
type Payload = { authenticated: boolean; emailVerified: boolean; summary: { count: number; average: number }; reviews: Review[]; myReview: Review | null; error?: string };
const stars = [1, 2, 3, 4, 5];

function Stars({ value }: { value: number }) {
  return <span className="review-stars" aria-label={`${value} من 5`}>{stars.map((star) => <i key={star} className={star <= Math.round(value) ? 'is-on' : ''}>★</i>)}</span>;
}

export function SiteReviews() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/site-reviews', { cache: 'no-store' });
      const data = await response.json() as Payload;
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل التقييمات.');
      setPayload(data);
      if (data.myReview) { setRating(data.myReview.rating); setReview(data.myReview.body); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر تحميل التقييمات.'); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/site-reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, review }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ التقييم.');
      setFeedback(payload?.myReview ? 'تم تحديث تقييمك.' : 'شكرًا، تم نشر تقييمك.');
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذر حفظ التقييم.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError('');
    const response = await fetch('/api/site-reviews', { method: 'DELETE' });
    if (response.ok) { setRating(0); setReview(''); setFeedback('تم حذف تقييمك.'); await load(); }
    else setError('تعذر حذف تقييمك الآن.');
    setBusy(false);
  }

  return (
    <section className="site-reviews section" id="site-reviews" aria-labelledby="site-reviews-title">
      <div className="shell">
        <header className="site-reviews__heading"><div><span>تجربة أعضاء المجتمع</span><h2 id="site-reviews-title">كيف تقيّم دليل نقادة؟</h2><p>رأيك يساعدنا على تحسين الدليل، ودقة البيانات، وسهولة الوصول للخدمات المحلية.</p></div>{payload?.summary.count ? <div className="reviews-score"><strong>{payload.summary.average.toFixed(1)}</strong><div><Stars value={payload.summary.average}/><span>{payload.summary.count} تقييمات</span></div></div> : null}</header>
        <div className="site-reviews__grid">
          <div className="review-form-card">
            {!payload ? <div className="review-loading">جارٍ تحميل مساحة التقييم…</div> : payload.authenticated ? payload.emailVerified ? (
              <form onSubmit={submit}>
                <span>{payload.myReview ? 'تعديل تقييمك' : 'شارك تجربتك'}</span><h3>{payload.myReview ? 'حدّث رأيك في الدليل' : 'اكتب رأيك في تجربة الاستخدام'}</h3>
                <label>عدد النجوم</label><div className="review-picker" role="group" aria-label="اختر عدد النجوم" dir="ltr">{stars.map((star) => <button key={star} type="button" className={star <= rating ? 'is-on' : ''} onClick={() => setRating(star)} aria-pressed={star === rating}>★</button>)}</div>
                <label htmlFor="site-review-text">رأيك</label><textarea id="site-review-text" value={review} onChange={(event) => setReview(event.target.value.slice(0, 800))} minLength={20} maxLength={800} required placeholder="اكتب تجربة واضحة ومفيدة في 20 حرفًا على الأقل…"/>
                <div className="review-form-meta"><span>تقييم من حساب عضو مؤكد</span><span>{review.trim().length}/800</span></div>
                <div className="review-form-actions"><button type="submit" disabled={busy || !rating || review.trim().length < 20}>{busy ? 'جارٍ الحفظ…' : payload.myReview ? 'حفظ التعديل' : 'نشر التقييم'}</button>{payload.myReview && <button type="button" onClick={remove} disabled={busy}>حذف</button>}</div>
              </form>
            ) : <div className="review-auth-note"><b>✓</b><div><strong>أكد بريدك أولًا</strong><p>التأكيد يحافظ على جودة تقييمات الأعضاء.</p></div></div> : (
              <div className="review-auth-note"><b>★</b><div><strong>سجّل الدخول لتشارك رأيك</strong><p>يمكن للجميع قراءة التقييمات، والكتابة للأعضاء المسجلين.</p><nav><Link href="/account/login">تسجيل الدخول</Link><Link href="/account/register">إنشاء حساب</Link></nav></div></div>
            )}
            <div className="review-feedback" aria-live="polite">{feedback && <span className="is-success">{feedback}</span>}{error && <span className="is-error">{error}</span>}</div>
          </div>
          <div className="review-list-wrap"><div className="review-list-head"><div><span>آراء المجتمع</span><h3>ماذا يقول أعضاء دليل نقادة؟</h3></div></div>{payload?.reviews.length ? <div className="review-list">{payload.reviews.map((item) => <article key={item.id}><header><span className="review-avatar">{item.authorName.charAt(0)}</span><div><strong>{item.authorName}</strong><small>{item.own ? 'تقييمك' : 'عضو مسجل'} · {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.createdAt))}</small></div></header><Stars value={item.rating}/><p>{item.body}</p></article>)}</div> : <div className="review-empty"><span>★★★★★</span><strong>كن أول من يشارك رأيه</strong><p>أضف تقييمك وساعدنا في بناء دليل أفضل لأهالي نقادة.</p></div>}</div>
        </div>
      </div>
    </section>
  );
}
