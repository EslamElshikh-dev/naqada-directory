import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { emptyVisitorAnalytics, getDiscoveryInsights, getVisitorAnalytics, isDirectoryAdmin } from '@/lib/auth/admin';
import { resolveSession } from '@/lib/auth/session';
import { buildGrowthPriorities } from '@/lib/growth-priority';
import styles from './growth.module.css';

export const metadata: Metadata = {
  title: 'أولويات نمو دليل نقادة',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function format(value: number) {
  return Number(value || 0).toLocaleString('ar-EG');
}

export default async function GrowthPriorityPage() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');

  const [discovery, analytics] = await Promise.all([
    getDiscoveryInsights(session.accessToken).catch(() => null),
    getVisitorAnalytics(session.accessToken).catch(() => emptyVisitorAnalytics),
  ]);
  const { items, summary } = buildGrowthPriorities(discovery?.missedSearches || analytics.missedSearches.filter((item) => !item.query.includes('\uFFFD')));

  return (
    <main id="main-content" className="admin-page admin-page--premium">
      <div className="shell admin-shell admin-shell--premium">
        <section className={styles.hero}>
          <span>Growth Priority V17</span>
          <h1>من «بحث بلا نتيجة» إلى خطة جمع بيانات مرتبة</h1>
          <p>
            هذه اللوحة تعطي الأولوية للطلب الحقيقي من الزوار، ثم تقيس فجوة الفئة داخل الموضع وضعف تغطية الموضع نفسه.
            النتيجة هي طابور عمل واضح للبحث والتحقق، وليس ادعاءً بأن النشاط موجود قبل إثباته.
          </p>
        </section>

        <section className={styles.metrics} aria-label="ملخص أولويات النمو">
          <article><span>حجم البحث بلا نتائج</span><strong>{format(summary.missedSearchVolume)}</strong></article>
          <article><span>عبارات طلب حقيقية</span><strong>{format(summary.missedSearchTerms)}</strong></article>
          <article><span>فرص مدعومة بالطلب</span><strong>{format(summary.demandBacked)}</strong></article>
          <article><span>مواضع شديدة الضعف</span><strong>{format(summary.weakLocalities)}</strong></article>
        </section>

        <section>
          <div className={styles.toolbar}>
            <div>
              <h2>طابور العمل المقترح</h2>
              <p>كل نقطة ترتفع بالطلب المتكرر، ونقص الفئة داخل المكان، ثم ضعف إجمالي التغطية المحلية.</p>
            </div>
            <nav aria-label="روابط تشغيل أولويات النمو">
              <Link href="/admin">لوحة الإدارة</Link>
              <Link href="/coverage">خريطة التغطية</Link>
              <Link href="/contribute">إضافة أو تصحيح</Link>
            </nav>
          </div>

          {items.length ? (
            <div className={styles.grid}>
              {items.map((item, index) => (
                <article className={styles.card} key={item.id}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>
                      <div>
                        <span className={`${styles.badge} ${item.source === 'search' ? styles.badgeDemand : ''}`}>
                          {item.source === 'search' ? 'طلب بحث فعلي' : 'تغطية استباقية'}
                        </span>
                        <span className={styles.badge}>{item.priority}</span>
                        <span className={styles.badge}>#{String(index + 1).padStart(2, '0')}</span>
                      </div>
                      <h3>{item.title}</h3>
                    </div>
                    <div className={styles.score} aria-label={`درجة الأولوية ${item.score} من 100`}>
                      <strong>{format(item.score)}</strong>
                      <small>من 100</small>
                    </div>
                  </div>

                  <div className={styles.meta}>
                    {item.locality ? <span>الموضع: {item.locality}</span> : <span>الموضع: يحتاج تصنيفًا</span>}
                    {item.categoryLabel ? <span>الفئة: {item.categoryLabel}</span> : <span>الفئة: تحتاج تصنيفًا</span>}
                    {item.source === 'search' ? <span>الطلب: {format(item.demandCount)}</span> : null}
                  </div>

                  <ul className={styles.signals}>
                    {item.signals.map((signal) => <li key={signal}>{signal}</li>)}
                  </ul>

                  <div className={styles.actions}>
                    <Link href={item.actionHref}>جهّز طلب جمع ←</Link>
                    {item.localityHref ? <Link href={item.localityHref}>افتح الموضع</Link> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              لا توجد فجوات مرتبة حاليًا. استمر في جمع بيانات البحث، وستظهر الأولويات هنا تلقائيًا.
            </div>
          )}
        </section>

        <section className={styles.method} aria-label="منهج ترتيب فرص النمو">
          <article><b>01</b><h3>الطلب الحقيقي أولًا</h3><p>تكرار البحث بلا نتيجة يأخذ أعلى وزن لأنه إشارة مباشرة من الزائر، وليس افتراضًا من النظام.</p></article>
          <article><b>02</b><h3>الفجوة المحلية ثانيًا</h3><p>إذا أمكن فهم الفئة والموضع، ترتفع الأولوية عندما تكون الفئة ضعيفة أو غائبة داخل هذا الموضع.</p></article>
          <article><b>03</b><h3>التغطية الاستباقية لا تتصدر وحدها</h3><p>المواضع الضعيفة تحصل على فرص استكمال، لكن درجاتها تظل دون الطلب القوي حتى لا يتغلب التخمين على سلوك المستخدم.</p></article>
        </section>
      </div>
    </main>
  );
}
