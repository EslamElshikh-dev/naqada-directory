'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContributionRequest } from '@/lib/contribution-review';
import styles from './pending-activities.module.css';

type EditableRequest = ContributionRequest & { payload: Record<string, string> };
const typeLabels: Record<string, string> = { add: 'إضافة نشاط', correction: 'تصحيح بيانات', missing: 'نشاط ناقص' };
export function PendingContributions({ items, categories, localities }: {
  items: EditableRequest[]; categories: string[]; localities: string[];
}) {
  const router = useRouter();
  const [working, setWorking] = useState('');
  const [message, setMessage] = useState('');
  async function decide(item: EditableRequest, action: string, form?: HTMLFormElement) {
    setWorking(item.id); setMessage('');
    try {
      const payload = form ? Object.fromEntries(new FormData(form).entries()) : undefined;
      const response = await fetch('/api/admin/contributions/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, action, payload }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Error(result.error || 'تعذّر الحفظ.');
      setMessage(action === 'publish' ? 'اتعمد الطلب واتنشر في الدليل.' : 'اتحفظ قرار المراجعة.');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'حاول تاني.'); }
    finally { setWorking(''); }
  }
  return <section className={styles.list} aria-labelledby="contribution-queue-title">
    <h2 id="contribution-queue-title">طلبات الإضافة والتصحيح <span>({items.length.toLocaleString('ar-EG')})</span></h2>
    {message ? <p role="status">{message}</p> : null}
    {items.length ? items.map((item) => <article id={`contribution-${item.id}`} className={styles.card} key={item.id}>
      <header><span>{typeLabels[item.requestType]} · {item.status === 'needs_info' ? 'يحتاج استكمال' : 'في انتظار المراجعة'}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}</time></header>
      <h3>{item.name}</h3><p><strong>نص الطلب:</strong> {item.details || 'لم يرفق تفاصيل'}</p>
      {item.contact ? <p>وسيلة متابعة خاصة: <b dir="auto">{item.contact}</b></p> : null}
      {item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl) ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">فتح المصدر المرفق</a> : null}
      <form onSubmit={(event) => { event.preventDefault(); void decide(item, 'publish', event.currentTarget); }}>
        <div className={styles.fields}>
          <label>اسم النشاط<input name="title" defaultValue={item.payload.title} required minLength={3} maxLength={160} /></label>
          <label>القسم<select name="category" defaultValue={item.payload.category} required><option value="">اختر القسم</option>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>المكان<select name="locality" defaultValue={item.payload.locality} required><option value="">اختر المكان</option>{localities.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>رقم النشاط العام<input name="phone" defaultValue={item.payload.phone} dir="ltr" maxLength={20} pattern="[+]?[0-9]{10,15}" /></label>
          <label>العنوان<input name="address" defaultValue={item.payload.address} maxLength={240} /></label>
          <label>رابط المصدر<input name="sourceUrl" defaultValue={item.payload.sourceUrl} type="url" dir="ltr" maxLength={1000} /></label>
        </div>
        <label className={styles.description}>الوصف المنشور<textarea name="summary" defaultValue={item.payload.summary} required minLength={15} maxLength={2000} rows={3} /></label>
        <p>راجع البيانات العامة قبل النشر. وسيلة المتابعة الخاصة لا تُنشر تلقائيًا.</p>
        <div className={styles.actions}><button disabled={!!working} type="submit">{working === item.id ? 'جارٍ الحفظ…' : 'قبول ونشر مباشرة'}</button><button disabled={!!working} type="button" onClick={() => void decide(item, 'needs_info')}>يحتاج استكمال</button><button disabled={!!working} type="button" onClick={() => void decide(item, 'rejected')}>رفض الطلب</button></div>
      </form>
    </article>) : <p className={styles.empty}>مفيش طلبات إضافة أو تصحيح منتظرة.</p>}
  </section>;
}
