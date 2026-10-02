import Link from 'next/link';
import type { RecentRequest } from '@/lib/contribution-review';
import styles from './recent-requests.module.css';

const statuses: Record<string, string> = {
  pending: 'بانتظار المراجعة', reviewing: 'قيد المراجعة', needs_info: 'يحتاج استكمال',
  approved: 'مقبول — ينتظر النشر', published: 'تم النشر', rejected: 'لم يُقبل',
};
const types: Record<string, string> = { business: 'نشاط عضو', add: 'إضافة نشاط', correction: 'تصحيح بيانات', missing: 'نشاط ناقص' };
function dateLabel(date: string) {
  return new Date(date).toLocaleString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' });
}

export function RecentRequests({ items, compact = false }: { items: RecentRequest[] | null; compact?: boolean }) {
  const visible = compact ? items?.slice(0, 8) : items;
  return <section className={styles.section} id="recent-requests" aria-labelledby="recent-requests-title">
    <header className={styles.heading}><div><span>متابعة الطلبات</span><h2 id="recent-requests-title">آخر الطلبات</h2><p>الأحدث أولًا حسب وقت الإرسال · الطلبات المفتوحة والمنشورة · توقيت مصر</p></div>
      {compact ? <Link href="/admin/activities/#recent-requests">كل الطلبات ←</Link> : <a href="#contribution-queue-title">طلبات التصحيح المفتوحة ↓</a>}
    </header>
    {visible === null ? <p role="alert">تعذّر تحميل آخر الطلبات. جرّب تحديث اللوحة.</p> : visible?.length ? <ol className={styles.list}>{visible.map((item) => <li id={`request-${item.kind}-${item.id}`} key={`${item.kind}:${item.id}`} className={styles.card}>
      <div className={styles.top}><span>{types[item.requestType] || 'طلب نشاط'}</span><strong className={styles.status} data-status={item.status}>{statuses[item.status] || item.status}</strong></div>
      <h3>{item.name}</h3><p className={styles.meta}>{item.locality || 'مركز نقادة'} · {item.submitter || (item.hasMember ? 'عضو مسجّل' : 'مرسل بدون حساب')}</p>
      <dl className={styles.dates}><div><dt>وقت الإرسال</dt><dd><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></dd></div>{item.reviewedAt ? <div><dt>آخر قرار</dt><dd><time dateTime={item.reviewedAt}>{dateLabel(item.reviewedAt)}</time></dd></div> : null}</dl>
      {!item.hasMember ? <p className={styles.hint}>الطلب غير مرتبط بحساب؛ إشعار القرار داخل الموقع غير متاح لصاحبه.</p> : null}
      <details className={styles.details}><summary>تفاصيل الطلب الأصلي</summary><p>{item.details || 'لم تُرفق تفاصيل إضافية.'}</p>{item.contact ? <p>وسيلة المتابعة: <b dir="auto">{item.contact}</b></p> : null}<small>رقم الطلب: <b dir="ltr">{item.id}</b></small></details>
      <div className={styles.actions}>{['pending', 'reviewing', 'needs_info', 'approved'].includes(item.status) ? <Link href={item.reviewHref}>مراجعة الطلب ←</Link> : compact ? <Link href={item.reviewHref}>فتح سجل الطلب ←</Link> : null}{item.status === 'published' ? <Link href={item.href}>عرض النشاط المنشور ↗</Link> : null}</div>
    </li>)}</ol> : <p className={styles.empty}>هتظهر هنا طلبات الإضافة والتصحيح فور وصولها.</p>}
  </section>;
}
