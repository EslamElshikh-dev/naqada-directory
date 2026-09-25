import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { DiscoveryInsights } from '@/lib/auth/admin';
import styles from './discovery-panel.module.css';

const count = (value: number) => Number(value || 0).toLocaleString('ar-EG');
const dayLabel = (date: string) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', weekday: 'short' }).format(new Date(`${date}T12:00:00Z`));
const timestamp = (date: string) => new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(date));

export function DiscoveryPanel({ insights, available, pathLabel }: {
  insights: DiscoveryInsights;
  available: boolean;
  pathLabel: (path: string) => string;
}) {
  const today = insights.dailySeries.at(-1);
  const missRate = insights.searchSummary.total
    ? Math.round(insights.searchSummary.missed / insights.searchSummary.total * 100) : 0;
  const topViews = Math.max(1, ...insights.topPages.map((page) => page.views));

  return (
    <section id="discovery" className={`admin-section ${styles.panel}`} aria-labelledby="discovery-heading">
      <header>
        <div>
          <span>من سلوك الزائر الفعلي</span>
          <h2 id="discovery-heading">الزيارات اليومية وفرص تطوير الدليل</h2>
          <p>زائر جديد يعني أول زيارة مسجلة من نفس المتصفح. اليوم يبدأ وينتهي بتوقيت نقادة (القاهرة)، والبيانات تُجمع من داخل الموقع.</p>
        </div>
        {available && insights.generatedAt ? <small>آخر قراءة: {timestamp(insights.generatedAt)}</small> : null}
      </header>

      {!available ? <p className={styles.empty}>بيانات هذا القسم غير متاحة حاليًا. جرّب تحديث لوحة الإدارة بعد قليل.</p> : (
        <>
          <div className={styles.overview}>
            <article><span>زوار جدد اليوم</span><strong>{count(today?.newVisitors || 0)}</strong><small>أول زيارة مسجلة اليوم</small></article>
            <article><span>زوار اليوم</span><strong>{count(today?.visitors || 0)}</strong><small>متصفحات فريدة خلال اليوم</small></article>
            <article><span>مشاهدات اليوم</span><strong>{count(today?.views || 0)}</strong><small>فتح صفحات داخل الدليل</small></article>
            <article><span>بحث بلا نتيجة</span><strong>{count(insights.searchSummary.missed)}</strong><small>{count(insights.searchSummary.total)} بحثًا خلال ٣٠ يومًا · {count(missRate)}٪ بلا نتيجة</small></article>
          </div>

          <div className={styles.dailyBlock}>
            <div className={styles.blockHead}><div><span>كل يوم في مكانه</span><h3>الزيارات خلال آخر ٣٠ يومًا</h3></div><small>التوقيت: نقادة · مصر</small></div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>عدد الزوار الجدد والزوار الفريدين ومشاهدات الصفحات لكل يوم</caption>
                <thead><tr><th scope="col">اليوم</th><th scope="col">الجدد</th><th scope="col">الزوار</th><th scope="col">الصفحات</th></tr></thead>
                <tbody>{[...insights.dailySeries].reverse().map((day) => (
                  <tr key={day.date}><th scope="row">{dayLabel(day.date)}</th><td><strong>{count(day.newVisitors)}</strong></td><td>{count(day.visitors)}</td><td>{count(day.views)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className={styles.columns}>
            <section className={styles.block} aria-labelledby="visited-heading">
              <div className={styles.blockHead}><div><span>المحتوى المقروء</span><h3 id="visited-heading">الصفحات التي زارها الناس</h3></div><small>آخر ٣٠ يومًا</small></div>
              {insights.topPages.length ? <ol className={styles.pages}>{insights.topPages.map((page, index) => (
                <li key={page.path}>
                  <span className={styles.index}>{count(index + 1)}</span>
                  <div className={styles.pageCopy}><strong>{pathLabel(page.path)}</strong><small dir="ltr">{page.path}</small><i style={{ '--measure': `${page.views / topViews * 100}%` } as CSSProperties} /></div>
                  <div className={styles.pageCount}><strong>{count(page.views)}</strong><small>{count(page.visitors)} زائر</small></div>
                </li>
              ))}</ol> : <p className={styles.empty}>لم تُسجّل مشاهدات صفحات خلال هذه الفترة.</p>}
            </section>

            <section className={styles.block} aria-labelledby="missing-heading">
              <div className={styles.blockHead}><div><span>ما طلبه أهل البلد</span><h3 id="missing-heading">كلمات اتبحث عنها ومظهرتش</h3></div><Link href="/admin/growth">رتّب فرص الإضافة ←</Link></div>
              {insights.missedSearches.length ? <ol className={styles.missed}>{insights.missedSearches.map((item, index) => (
                <li key={`${item.query}-${item.category}-${item.locality}`}>
                  <span className={styles.index}>{count(index + 1)}</span>
                  <div><strong dir="auto">{item.query}</strong><small>{[item.locality, item.category && item.category !== 'all' ? item.category : ''].filter(Boolean).join(' · ') || 'بحث في الدليل'} · آخر مرة {timestamp(item.lastSeenAt)}</small></div>
                  <b>{count(item.count)} مرات</b>
                </li>
              ))}</ol> : <p className={styles.empty}>لا توجد عبارات بحث بلا نتائج مسجلة خلال آخر ٣٠ يومًا.</p>}
            </section>
          </div>
          <p className={styles.note}>العداد يعتمد على معرّف محفوظ للمتصفح، لذلك تغيير الجهاز أو حذف بيانات التصفح قد يُحسب زيارة جديدة. البيانات السابقة على تحديث القياس في ٢٥ سبتمبر ٢٠٢٦ قد تضم زيارات فحص آلي؛ بدأ استبعاد المتصفحات الآلية المعروفة من التسجيل الجديد، ولا يمكن تمييز كل زيارة تاريخية بيقين. تظهر هنا عمليات البحث المكتملة، مع استبعاد بيانات الاتصال والعبارات غير المقروءة من قائمة الكلمات المقترحة، بينما يبقى إجمالي الأحداث المسجلة كاملًا.</p>
        </>
      )}
    </section>
  );
}
