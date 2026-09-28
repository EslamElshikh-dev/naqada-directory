import type { SanadInsights } from '@/lib/auth/admin';
import styles from './sanad-panel.module.css';

function number(value: number) { return Number(value || 0).toLocaleString('ar-EG'); }

export function SanadPanel({ insights }: { insights: SanadInsights | null }) {
  return <section className={`admin-section ${styles.section}`} id="sanad-insights">
    <header><div><span>سند · مساعد دليل نقادة</span><h2>ماذا سأل الزوار؟ وماذا أجاب سند؟</h2><p>الأسئلة والإجابات المسجلة فعلًا منذ تفعيل القياس. «أجاب» تعني أنه أرسل ردًا، ولا تعني صحة الإجابة دون مراجعتها.</p></div></header>
    {!insights ? <p className="admin-data-warning">تعذر تحميل إحصاءات سند الآن؛ حاول تحديث لوحة الإدارة.</p> : <>
      <div className={styles.metrics}>
        <article><small>أسئلة اليوم</small><strong>{number(insights.today)}</strong><span>بتوقيت مصر</span></article>
        <article><small>أسئلة أمس</small><strong>{number(insights.yesterday)}</strong><span>بتوقيت مصر</span></article>
        <article><small>آخر ٣٠ يومًا</small><strong>{number(insights.questions30d)}</strong><span>{number(insights.visitors30d)} متصفح سأل سند</span></article>
        <article><small>إجابات مرسلة</small><strong>{number(insights.answered30d)}</strong><span>من الأسئلة المسجلة</span></article>
        <article><small>بلا نتيجة مطابقة</small><strong>{number(insights.noResult30d)}</strong><span>فرص لتحسين تغطية الدليل</span></article>
      </div>
      <div className={styles.columns}>
        <div className={styles.list}><h3>الأسئلة والإجابات الأخيرة</h3>{insights.recent.length ? insights.recent.map((item, index) => <details key={`${item.at}-${index}`}>
          <summary><span>{item.outcome === 'no_result' ? 'بلا نتيجة' : 'ردّ سند'}</span><strong>{item.question}</strong><time dateTime={item.at}>{new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(item.at))}</time></summary>
          <div><b>إجابة سند المسجلة</b><p>{item.answer}</p></div>
        </details>) : <p className={styles.empty}>ستظهر هنا أول الأسئلة بعد تفعيل القياس؛ لا توجد محادثات سابقة يمكن استعادتها.</p>}</div>
        <aside className={styles.frequent}><h3>أكثر الأسئلة تكرارًا</h3>{insights.frequent.length ? <ol>{insights.frequent.map(item => <li key={item.question}><span>{item.question}</span><b>{number(item.count)}</b></li>)}</ol> : <p className={styles.empty}>لا توجد أسئلة مسجلة بعد.</p>}<p className={styles.privacy}>التفاصيل للإدارة فقط. تُحجب أرقام التواصل والبريد قبل التخزين، وتُحذف السجلات بعد ٩٠ يومًا.</p></aside>
      </div>
    </>}
  </section>;
}
