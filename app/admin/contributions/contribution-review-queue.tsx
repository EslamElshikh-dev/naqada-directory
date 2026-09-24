'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ContributionQueueSnapshot, ContributionStatus, ReviewQueueItem } from '@/lib/contribution-review';
import type { ContributionReviewAction } from '@/lib/auth/contribution-operations';
import styles from './contributions.module.css';

type StatusFilter = 'open' | 'all' | ContributionStatus;

const statusLabels: Record<ContributionStatus, string> = {
  pending: 'جديد',
  reviewing: 'قيد المراجعة',
  needs_info: 'مطلوب معلومات',
  approved: 'معتمد',
  rejected: 'مرفوض',
  published: 'نُشر',
};

const typeLabels = {
  add: 'إضافة نشاط',
  correction: 'تصحيح بيانات',
  missing: 'نتيجة مفقودة',
} as const;

const actionLabels: Record<ContributionReviewAction, string> = {
  start_review: 'ابدأ المراجعة',
  request_info: 'اطلب معلومات',
  approve: 'اعتماد',
  reject: 'رفض',
  mark_published: 'تم تحديث الدليل',
  reopen: 'إعادة فتح',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function isOpen(status: ContributionStatus) {
  return status === 'pending' || status === 'reviewing' || status === 'needs_info';
}

function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function ContributionReviewQueue({ items, summary }: { items: ReviewQueueItem[]; summary: ContributionQueueSnapshot['summary'] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(items.find((item) => isOpen(item.status))?.id || items[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<ContributionReviewAction | ''>('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const statusMatch = statusFilter === 'all' || (statusFilter === 'open' ? isOpen(item.status) : item.status === statusFilter);
      const typeMatch = typeFilter === 'all' || item.requestType === typeFilter;
      const searchMatch = !needle || [item.name, item.locality, item.category, item.details, item.listingMatch?.name]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      return statusMatch && typeMatch && searchMatch;
    });
  }, [items, query, statusFilter, typeFilter]);

  const selected = items.find((item) => item.id === selectedId) || filtered[0] || null;
  const sourceHref = safeExternalUrl(selected?.sourceUrl);
  const canRequestInfo = Boolean(selected && isOpen(selected.status) && (selected.submittedByUserId || selected.contact));

  async function runAction(action: ContributionReviewAction) {
    if (!selected || busy) return;
    setBusy(action); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/admin/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, action, notes, message }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || payload.ok !== true) throw new Error(payload.error || 'تعذر تحديث المساهمة.');
      setFeedback(`تم تنفيذ: ${actionLabels[action]}`);
      setNotes(''); setMessage('');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر تحديث المساهمة.');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <section className={styles.metrics} aria-label="ملخص المساهمات">
        <article><span>جديد</span><strong>{summary.pending.toLocaleString('ar-EG')}</strong></article>
        <article><span>قيد المراجعة</span><strong>{summary.reviewing.toLocaleString('ar-EG')}</strong></article>
        <article><span>مطلوب معلومات</span><strong>{summary.needsInfo.toLocaleString('ar-EG')}</strong></article>
        <article><span>معتمد / منشور</span><strong>{(summary.approved + summary.published).toLocaleString('ar-EG')}</strong></article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.queuePanel}>
          <header className={styles.toolbar}>
            <div><h2>طابور المراجعة</h2><p>الأولوية تُحسب من نوع الطلب، وجود المصدر، وعمر الطلب.</p></div>
            <div className={styles.filters}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الموضع…" aria-label="بحث في طابور المراجعة" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="تصفية حسب الحالة">
                <option value="open">المفتوحة</option><option value="all">الكل</option><option value="pending">الجديدة</option><option value="reviewing">قيد المراجعة</option><option value="needs_info">مطلوب معلومات</option><option value="approved">المعتمدة</option><option value="rejected">المرفوضة</option><option value="published">المنشورة</option>
              </select>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="تصفية حسب النوع">
                <option value="all">كل الأنواع</option><option value="add">إضافة نشاط</option><option value="correction">تصحيح بيانات</option><option value="missing">نتيجة مفقودة</option>
              </select>
            </div>
          </header>

          <div className={styles.queue}>
            {filtered.length ? filtered.map((item) => (
              <button type="button" className={`${styles.queueItem} ${selected?.id === item.id ? styles.active : ''}`} key={item.id} onClick={() => { setSelectedId(item.id); setNotes(item.reviewNotes || ''); setMessage(item.reviewMessage || ''); setError(''); setFeedback(''); }}>
                <div className={styles.queueTop}><span className={styles.priority}>{item.priorityBand} · {item.reviewPriority}</span><span className={styles.status} data-status={item.status}>{statusLabels[item.status]}</span></div>
                <strong>{item.name}</strong>
                <small>{typeLabels[item.requestType]} · {item.locality || 'موضع غير محدد'} · منذ {item.ageDays.toLocaleString('ar-EG')} يوم</small>
                <div className={styles.queueSignals}>
                  <span>{item.sourceUrl ? 'مصدر ✓' : 'بلا مصدر'}</span>
                  <span>التحقق: {item.verificationState}</span>
                  {item.duplicateCount ? <span>تكرار محتمل ×{item.duplicateCount.toLocaleString('ar-EG')}</span> : null}
                </div>
              </button>
            )) : <div className={styles.empty}>لا توجد مساهمات تطابق الفلاتر الحالية.</div>}
          </div>
        </div>

        <aside className={styles.detailPanel}>
          {selected ? (
            <>
              <div className={styles.detailHead}>
                <div><span>{typeLabels[selected.requestType]}</span><h2>{selected.name}</h2><p>#{selected.id.slice(0, 8)} · {formatDate(selected.createdAt)}</p></div>
                <span className={styles.status} data-status={selected.status}>{statusLabels[selected.status]}</span>
              </div>

              <div className={styles.factGrid}>
                <article><span>الأولوية</span><strong>{selected.reviewPriority} · {selected.priorityBand}</strong></article>
                <article><span>حالة التحقق</span><strong>{selected.verificationState}</strong></article>
                <article><span>الموضع</span><strong>{selected.locality || 'غير محدد'}</strong></article>
                <article><span>الفئة</span><strong>{selected.category || 'غير محددة'}</strong></article>
              </div>

              {selected.details ? <section className={styles.block}><span>تفاصيل المساهم</span><p>{selected.details}</p></section> : null}

              <section className={styles.block}>
                <span>المصدر والمطابقة</span>
                {sourceHref ? <a href={sourceHref} target="_blank" rel="noopener noreferrer">فتح المصدر الداعم ↗</a> : selected.sourceUrl ? <p>رابط المصدر غير صالح للفتح الآمن؛ راجع النص فقط داخل السجل الخام.</p> : <p>لم يُرفق مصدر عام.</p>}
                {selected.listingMatch ? <div className={styles.match}><div><b>مطابقة محتملة {selected.listingMatch.score}%</b><p>{selected.listingMatch.name} · {selected.listingMatch.reason}</p></div><Link href={`/listing/${selected.listingMatch.slug}`} target="_blank">فتح السجل ↗</Link></div> : <p>لا توجد مطابقة موثوقة مع سجل منشور حاليًا.</p>}
                {selected.duplicateCount ? <p className={styles.warning}>يوجد {selected.duplicateCount.toLocaleString('ar-EG')} طلب آخر يطابق الاسم/السجل؛ راجعه قبل إنشاء سجل جديد.</p> : null}
              </section>

              <section className={styles.block}>
                <span>قناة المتابعة</span>
                {selected.contact ? <p className={styles.contact} dir="auto">{selected.contact}</p> : <p>لا توجد وسيلة تواصل اختيارية. {selected.submittedByUserId ? 'الطلب مرتبط بعضو مسجل ويمكنه رؤية رسالة المراجعة في حسابه.' : 'للطلب المجهول لا يمكن طلب معلومات إضافية؛ يلزم اتخاذ قرار اعتماد أو رفض وفق الأدلة المتاحة.'}</p>}
              </section>

              <section className={styles.reviewBox}>
                <label><span>ملاحظات الإدارة الداخلية</span><textarea value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 2000))} maxLength={2000} placeholder="سبب القرار، نتيجة التحقق، أو ما يجب تنفيذه داخل بيانات الدليل…" /></label>
                <label><span>رسالة للمساهم</span><textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 600))} maxLength={600} placeholder="مطلوبة عند طلب معلومات إضافية؛ لا تستخدمها لملاحظات داخلية." /></label>
                <div className={styles.actionGrid}>
                  {selected.status === 'pending' ? <button onClick={() => runAction('start_review')} disabled={Boolean(busy)}>بدء المراجعة</button> : null}
                  {canRequestInfo ? <button onClick={() => runAction('request_info')} disabled={Boolean(busy)}>طلب معلومات</button> : null}
                  {isOpen(selected.status) ? <button className={styles.approve} onClick={() => runAction('approve')} disabled={Boolean(busy)}>اعتماد</button> : null}
                  {isOpen(selected.status) ? <button className={styles.reject} onClick={() => runAction('reject')} disabled={Boolean(busy)}>رفض</button> : null}
                  {selected.status === 'approved' ? <button className={styles.approve} onClick={() => runAction('mark_published')} disabled={Boolean(busy)}>تأكيد تحديث الدليل</button> : null}
                  {!isOpen(selected.status) && selected.status !== 'approved' ? <button onClick={() => runAction('reopen')} disabled={Boolean(busy)}>إعادة فتح</button> : null}
                </div>
                <div className={styles.feedback} aria-live="polite">{busy ? `جارٍ تنفيذ: ${actionLabels[busy]}…` : error ? <span className={styles.error}>{error}</span> : feedback ? <span className={styles.success}>{feedback}</span> : 'لا يتم أي تعديل في بيانات الدليل تلقائيًا عند الاعتماد؛ حالة «تم تحديث الدليل» تُستخدم بعد تنفيذ التغيير فعليًا في البيانات المنشورة.'}</div>
              </section>

              {selected.reviewer ? <p className={styles.audit}>آخر مراجعة: {selected.reviewer} · {formatDate(selected.reviewedAt)}</p> : null}
            </>
          ) : <div className={styles.empty}>اختر مساهمة لعرض تفاصيلها.</div>}
        </aside>
      </section>
    </>
  );
}
