import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businesses, categories, localities, meta } from '@/lib/data';
import { emptyVisitorAnalytics, getAdminStats, getVisitorAnalytics, isDirectoryAdmin, type VisitorAnalytics } from '@/lib/auth/admin';
import { resolveSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'لوحة إدارة الدليل', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const eventLabels: Record<string, string> = {
  search: 'عمليات البحث', zero_results: 'بحث دون نتائج', listing_call: 'ضغطات الاتصال',
  listing_whatsapp: 'فتح واتساب', listing_map: 'فتح الخرائط', listing_share: 'مشاركة نشاط',
  contribution_prepare: 'بدء مساهمة', contribution_copy: 'نسخ مساهمة', contribution_share: 'مشاركة طلب',
  contribution_contact: 'التواصل للإضافة',
};

function format(value: number) { return Number(value || 0).toLocaleString('ar-EG'); }
function percentage(value: number) { return `${value.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%`; }
function pathLabel(path: string) {
  const labels: Record<string, string> = {
    '/': 'الرئيسية', '/directory': 'دليل الخدمات', '/villages': 'القرى والنجوع', '/landmarks': 'معالم نقادة', '/blog': 'المدونة', '/contribute': 'إضافة أو تصحيح نشاط', '/account': 'لوحة العضو',
  };
  if (labels[path]) return labels[path];
  if (path.startsWith('/listing/')) return `نشاط: ${decodeURIComponent(path.split('/')[2] || '').replace(/-/g, ' ')}`;
  if (path.startsWith('/villages/')) return `صفحة مكان: ${decodeURIComponent(path.split('/')[2] || '').replace(/-/g, ' ')}`;
  return decodeURIComponent(path).replaceAll('/', ' / ').trim() || 'الرئيسية';
}
function sourceLabel(source: string) {
  if (source === 'direct') return 'دخول مباشر أو رابط محفوظ';
  if (source.includes('google.')) return 'بحث Google';
  if (source.includes('facebook.') || source.includes('fb.')) return 'Facebook';
  if (source.includes('whatsapp.')) return 'WhatsApp';
  return source;
}
function dateLabel(date: string) { return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00Z`)); }
function timeLabel(date: string) { return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(date)); }
function growth(current: number, previous: number) {
  if (!previous) return current ? { label: 'بداية قياس جديدة', tone: 'up' } : { label: 'بانتظار أول زائر', tone: 'flat' };
  const value = ((current - previous) / previous) * 100;
  return { label: `${value > 0 ? '+' : ''}${percentage(value)}`, tone: value > 0 ? 'up' : value < 0 ? 'down' : 'flat' };
}

function MetricIcon({ name }: { name: 'people' | 'spark' | 'eye' | 'member' }) {
  const paths = {
    people: <><circle cx="9" cy="9" r="3"/><path d="M3.5 19c.7-3.1 2.5-4.8 5.5-4.8s4.8 1.7 5.5 4.8M16 7.5a2.6 2.6 0 0 1 0 5M17.2 14.4c2 .5 3.1 2 3.5 4.1"/></>,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="m18.5 14 .7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></>,
    member: <><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.5c.8-3.5 3-5.3 6.5-5.3s5.7 1.8 6.5 5.3"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function RankList({ items, max, type }: { items: Array<{ label: string; value: number; detail: string }>; max: number; type: string }) {
  return <div className="admin-rank-list">{items.length ? items.map((item, index) => <div className="admin-rank-row" key={`${type}-${item.label}`}><div><span>{(index + 1).toLocaleString('ar-EG')}</span><p><strong>{item.label}</strong><small>{item.detail}</small></p><b>{format(item.value)}</b></div><i><span style={{ width: `${Math.max(7, (item.value / Math.max(1, max)) * 100)}%` }} /></i></div>) : <div className="admin-empty">ستظهر البيانات هنا بعد بدء الزيارات.</div>}</div>;
}

function buildSuggestions(analytics: VisitorAnalytics, pending: number) {
  const { totals } = analytics;
  const result: Array<{ title: string; text: string; priority: string }> = [];
  if (!totals.lifetimeVisitors) result.push({ title: 'بدأ نظام القياس الآن', text: 'اترك النظام يجمع بيانات فعلية لعدة أيام، ثم قارن الجدد بالعائدين وأعلى الصفحات.', priority: 'بدء' });
  const pagesPerVisitor = totals.uniqueVisitors30d ? totals.pageViews30d / totals.uniqueVisitors30d : 0;
  if (pagesPerVisitor > 0 && pagesPerVisitor < 1.5) result.push({ title: 'قوِّ الانتقال بين الصفحات', text: 'متوسط الصفحات لكل زائر منخفض؛ أضف روابط أنشطة مشابهة ومسارات تالية أوضح داخل صفحة النشاط.', priority: 'تجربة' });
  const newShare = totals.uniqueVisitors30d ? totals.newVisitors30d / totals.uniqueVisitors30d : 0;
  if (newShare > .75 && totals.uniqueVisitors30d >= 5) result.push({ title: 'حوّل الجدد إلى زوار عائدين', text: 'نسبة الجدد مرتفعة. أبرز آخر التحديثات والمفضلة ودعوة إنشاء الحساب في نهاية الصفحات الأعلى زيارة.', priority: 'نمو' });
  if (analytics.missedSearches.length) result.push({ title: 'أغلق فجوات البحث', text: `ابدأ بإضافة أو تحسين نتيجة «${analytics.missedSearches[0].query}» لأنها تتكرر دون نتيجة.`, priority: 'بيانات' });
  if (pending) result.push({ title: 'راجع المساهمات المفتوحة', text: `يوجد ${format(pending)} طلبًا ينتظر المراجعة؛ معالجته تحسن حداثة الدليل وثقة المستخدم.`, priority: 'تشغيل' });
  if (!result.length) result.push({ title: 'حافظ على جودة الصفحات الأعلى', text: 'راجع بيانات الاتصال والخرائط في الصفحات الأكثر زيارة أسبوعيًا، وراقب أي تراجع في الزوار العائدين.', priority: 'جودة' });
  return result.slice(0, 4);
}

export default async function AdminPage() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');
  const [stats, analytics] = await Promise.all([
    getAdminStats(session.accessToken).catch(() => ({ members: 0, siteReviews: 0, siteRating: 0, listingRatings: 0, pendingContributions: 0, events30d: 0 })),
    getVisitorAnalytics(session.accessToken).catch(() => emptyVisitorAnalytics),
  ]);
  const totals = analytics.totals;
  const reviewed = businesses.filter((item) => item.checked).length;
  const completion = Math.round((reviewed / Math.max(1, businesses.length)) * 100);
  const pagesPerVisitor = totals.uniqueVisitors30d ? totals.pageViews30d / totals.uniqueVisitors30d : 0;
  const returnRate = totals.uniqueVisitors30d ? (totals.returningVisitors30d / totals.uniqueVisitors30d) * 100 : 0;
  const visitorGrowth = growth(totals.uniqueVisitors30d, totals.previousUniqueVisitors30d);
  const chartMax = Math.max(1, ...analytics.dailySeries.map((item) => item.views));
  const pageMax = Math.max(1, ...analytics.topPages.map((item) => item.views));
  const sourceMax = Math.max(1, ...analytics.sources.map((item) => item.visitors));
  const suggestions = buildSuggestions(analytics, stats.pendingContributions);

  return (
    <main id="main-content" className="admin-page admin-page--premium">
      <section className="workspace-hero workspace-hero--admin admin-hero"><div className="shell workspace-hero__grid"><div><span>مركز القرار والتشغيل</span><h1>لوحة إدارة <em>دليل نقادة</em></h1><p>متابعة الزوار الحقيقيين ونمو الأعضاء وسلوك الاستخدام وجودة البيانات في واجهة واحدة واضحة.</p><nav aria-label="أقسام لوحة الإدارة"><a href="#audience">الجمهور</a><a href="#content">المحتوى</a><a href="#members">الزوار المسجلون</a><a href="#recommendations">مقترحات التحسين</a><a href="#operations">التشغيل</a></nav></div><aside><span>جلسة إدارة محمية</span><strong>{session.user.displayName}</strong><small>{session.user.email}</small><div><b><small>آخر 30 يومًا</small>مباشر</b><b><small>تعريف الزائر</small>آمن</b><b><small>حالة البيانات</small>محدّثة</b></div></aside></div></section>

      <div className="shell admin-shell admin-shell--premium">
        <nav className="admin-section-nav" aria-label="اختصارات لوحة التحكم"><a href="#audience"><b>01</b>الجمهور</a><a href="#content"><b>02</b>الصفحات والمصادر</a><a href="#members"><b>03</b>الأعضاء الزائرون</a><a href="#recommendations"><b>04</b>التحسين</a><a href="#operations"><b>05</b>التشغيل</a></nav>

        <section className="admin-section admin-audience" id="audience"><header><div><span>آخر 30 يومًا</span><h2>الجمهور الحقيقي للدليل</h2><p>كل متصفح يُحسب مرة واحدة كزائر فريد، بينما مشاهدة الصفحات تُحسب بشكل مستقل.</p></div><div className={`admin-growth is-${visitorGrowth.tone}`}><small>مقارنة بالفترة السابقة</small><strong>{visitorGrowth.label}</strong></div></header>
          <div className="admin-primary-metrics"><article><i><MetricIcon name="people" /></i><span>الزوار الفريدون</span><strong>{format(totals.uniqueVisitors30d)}</strong><small>{format(totals.visitorsToday)} زائرًا اليوم</small></article><article><i><MetricIcon name="spark" /></i><span>زوار جدد</span><strong>{format(totals.newVisitors30d)}</strong><small>أول زيارة من هذا المتصفح</small></article><article><i><MetricIcon name="eye" /></i><span>مشاهدات الصفحات</span><strong>{format(totals.pageViews30d)}</strong><small>{pagesPerVisitor.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} صفحة لكل زائر</small></article><article><i><MetricIcon name="member" /></i><span>زوار بأسماء معروفة</span><strong>{format(totals.identifiedVisitors30d)}</strong><small>أعضاء دخلوا بحساباتهم فقط</small></article></div>
          <div className="admin-trend-card"><header><div><span>آخر 14 يومًا</span><h3>اتجاه الزوار والمشاهدات</h3></div><dl><div><dt>العائدون</dt><dd>{format(totals.returningVisitors30d)}</dd></div><div><dt>معدل العودة</dt><dd>{percentage(returnRate)}</dd></div><div><dt>إجمالي الزوار المسجلين</dt><dd>{format(totals.lifetimeVisitors)}</dd></div></dl></header><div className="admin-trend" aria-label="رسم الزيارات اليومية">{analytics.dailySeries.length ? analytics.dailySeries.map((item) => <div key={item.date} title={`${dateLabel(item.date)}: ${format(item.visitors)} زائر و${format(item.views)} مشاهدة`}><span className="admin-trend__bar" style={{ '--bar-height': `${Math.max(item.views ? 8 : 2, (item.views / chartMax) * 100)}%` } as CSSProperties}><i style={{ '--visitor-height': `${Math.max(item.visitors ? 15 : 3, (item.visitors / Math.max(1, item.views)) * 100)}%` } as CSSProperties} /></span><small>{dateLabel(item.date)}</small></div>) : <div className="admin-chart-empty">تبدأ الأعمدة بالظهور مع أول زيارة منشورة.</div>}</div><footer><span><i className="is-views" />المشاهدات</span><span><i className="is-visitors" />الزوار الفريدون</span></footer></div>
        </section>

        <section className="admin-section" id="content"><header><div><span>فهم الاهتمام</span><h2>الصفحات والمصادر والأجهزة</h2><p>تعرف أين يذهب الجمهور، ومن أين وصل، وكيف تصفح الدليل.</p></div></header><div className="admin-insight-grid"><article className="admin-ranked-card admin-ranked-card--wide"><header><span>ترتيب المحتوى</span><h3>أكثر الصفحات زيارة</h3></header><RankList type="pages" max={pageMax} items={analytics.topPages.map((item) => ({ label: pathLabel(item.path), value: item.views, detail: `${format(item.visitors)} زائرًا فريدًا` }))} /></article><article className="admin-ranked-card"><header><span>الاكتساب</span><h3>مصادر الوصول</h3></header><RankList type="sources" max={sourceMax} items={analytics.sources.map((item) => ({ label: sourceLabel(item.source), value: item.visitors, detail: 'زائرًا فريدًا' }))} /></article><article className="admin-ranked-card"><header><span>تجربة الأجهزة</span><h3>طريقة التصفح</h3></header><div className="admin-device-list">{analytics.devices.length ? analytics.devices.map((item) => { const share = totals.uniqueVisitors30d ? item.visitors / totals.uniqueVisitors30d * 100 : 0; return <div key={item.device}><span>{item.device === 'mobile' ? 'هاتف جوال' : item.device === 'tablet' ? 'جهاز لوحي' : 'كمبيوتر'}</span><strong>{percentage(share)}</strong><i><span style={{ width: `${share}%` }} /></i><small>{format(item.visitors)} زائرًا</small></div>; }) : <div className="admin-empty">بانتظار بيانات الأجهزة.</div>}</div></article></div></section>

        <section className="admin-section" id="members"><header><div><span>أعضاء دخلوا بحساباتهم</span><h2>الزوار الذين يمكن معرفة أسمائهم</h2><p>لا يمكن معرفة اسم الزائر المجهول. الأسماء التالية تخص أعضاء سجّلوا الدخول ووافقوا على الملف العام.</p></div><small>{format(totals.members30d)} عضوًا جديدًا خلال 30 يومًا</small></header>{analytics.identifiedVisitors.length ? <div className="identified-visitors">{analytics.identifiedVisitors.map((visitor) => <article key={visitor.id}><div className="identified-visitor__avatar">{visitor.avatarUrl ? <Image src={visitor.avatarUrl} alt="" fill sizes="48px" referrerPolicy="no-referrer" /> : visitor.name.charAt(0)}</div><div><strong>{visitor.name}</strong>{visitor.bio ? <p>{visitor.bio}</p> : <small>{visitor.locality || 'عضو دليل نقادة'}</small>}<a href={`mailto:${visitor.email}`}>{visitor.email}</a></div><dl><div><dt>آخر ظهور</dt><dd>{timeLabel(visitor.lastSeenAt)}</dd></div><div><dt>مشاهدات</dt><dd>{format(visitor.pageViews)}</dd></div></dl></article>)}</div> : <div className="admin-empty admin-empty--large"><strong>لا يوجد عضو معروف زار الموقع منذ بدء القياس</strong><p>عند دخول عضو بحسابه سيظهر اسمه هنا، بينما تظل الزيارات المجهولة أرقامًا فقط.</p></div>}</section>

        <section className="admin-section" id="recommendations"><header><div><span>قرارات قابلة للتنفيذ</span><h2>مقترحات التحسين</h2><p>تتغير هذه الأولويات تلقائيًا حسب سلوك الزوار وجودة البيانات.</p></div></header><div className="admin-recommendations">{suggestions.map((item, index) => <article key={item.title}><span>{item.priority}</span><b>{String(index + 1).padStart(2, '0')}</b><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>

        <section className="admin-section" id="operations"><header><div><span>نبض التشغيل</span><h2>الأعضاء والتفاعل وجودة الدليل</h2></div><small>{analytics.generatedAt ? `آخر تجميع ${timeLabel(analytics.generatedAt)}` : 'بدأ التجميع الآن'}</small></header><div className="admin-stats admin-stats--expanded"><article><span>الأنشطة المنشورة</span><strong>{format(meta.businessCount)}</strong><small>داخل {format(categories.length)} قسمًا</small></article><article><span>إجمالي الأعضاء</span><strong>{format(stats.members)}</strong><small>{format(totals.members7d)} جدد خلال 7 أيام</small></article><article><span>تقييم الموقع</span><strong>{stats.siteReviews ? `${stats.siteRating}/5` : '—'}</strong><small>{format(stats.siteReviews)} تقييمات</small></article><article><span>تقييمات الأنشطة</span><strong>{format(stats.listingRatings)}</strong><small>تقييمات محفوظة</small></article><article><span>طلبات المراجعة</span><strong>{format(stats.pendingContributions)}</strong><small>قيد المتابعة</small></article><article><span>تفاعل 30 يومًا</span><strong>{format(stats.events30d)}</strong><small>بحث واتصال وخرائط</small></article></div><div className="admin-operations-grid"><div className="quality-score"><div style={{ '--quality-score': `${completion}%` } as CSSProperties}><strong>{completion}%</strong><span>مراجعة السجلات</span></div><dl><div><dt>السجلات المراجعة</dt><dd>{format(reviewed)}</dd></div><div><dt>المواضع الجغرافية</dt><dd>{format(localities.length)}</dd></div><div><dt>الأقسام النشطة</dt><dd>{format(categories.length)}</dd></div></dl></div><div className="admin-actions"><Link href="/contribute"><span>طلبات الإضافة والتصحيح</span><b>فتح المساهمات ←</b></Link><Link href="/updates"><span>تحديثات البيانات</span><b>مراجعة آخر السجلات ←</b></Link><Link href="/directory"><span>فحص الدليل العام</span><b>استعراض الأنشطة ←</b></Link><Link href="/account"><span>حساب المدير</span><b>العودة للملف الشخصي ←</b></Link></div></div>{analytics.events.length || analytics.missedSearches.length ? <div className="admin-activity-grid"><article className="admin-ranked-card"><header><span>الأحداث</span><h3>أكثر التفاعلات</h3></header><RankList type="events" max={Math.max(1, ...analytics.events.map((item) => item.count))} items={analytics.events.map((item) => ({ label: eventLabels[item.event] || item.event, value: item.count, detail: 'خلال 30 يومًا' }))} /></article><article className="admin-ranked-card"><header><span>فجوات المحتوى</span><h3>بحث بلا نتائج</h3></header><RankList type="queries" max={Math.max(1, ...analytics.missedSearches.map((item) => item.count))} items={analytics.missedSearches.map((item) => ({ label: item.query, value: item.count, detail: 'مرات دون نتيجة' }))} /></article></div> : null}</section>
      </div>
    </main>
  );
}
