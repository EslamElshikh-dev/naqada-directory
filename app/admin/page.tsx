import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { MemberAvatar } from '@/components/auth/member-avatar';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { isSearchGapOpen } from '@/lib/growth-priority';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businesses, categories, localities } from '@/lib/data';
import { emptyDiscoveryInsights, emptyVisitorAnalytics, getAdminStats, getDiscoveryInsights, getVisitorAnalytics, isDirectoryAdmin, type DiscoveryInsights, type VisitorAnalytics } from '@/lib/auth/admin';
import { resolveSession } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { getModeratorOwnerReport } from '@/lib/auth/moderator';
import { moderatorActionLabel, moderatorKindLabel } from '@/lib/moderator-labels';
import { DiscoveryPanel } from './discovery-panel';
import reportStyles from './moderator-report.module.css';
import ownerStyles from './owner-dashboard.module.css';
import { AdminLiveRefresh } from './admin-live-refresh';

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
  const normalizedPath = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const labels: Record<string, string> = {
    '/': 'الرئيسية', '/directory': 'دليل الخدمات', '/villages': 'القرى والنجوع', '/landmarks': 'معالم نقادة', '/blog': 'المدونة', '/contribute': 'إضافة أو تصحيح نشاط', '/account': 'لوحة العضو', '/knowledge': 'موسوعة نقادة', '/jobs': 'وظائف نقادة', '/role-models': 'نماذج مشرفة', '/updates': 'آخر التحديثات', '/search': 'البحث الموحد',
  };
  if (labels[normalizedPath]) return labels[normalizedPath];
  try {
    if (normalizedPath.startsWith('/listing/')) return `نشاط: ${decodeURIComponent(normalizedPath.split('/')[2] || '').replace(/-/g, ' ')}`;
    if (normalizedPath.startsWith('/villages/')) return `صفحة مكان: ${decodeURIComponent(normalizedPath.split('/')[2] || '').replace(/-/g, ' ')}`;
    return decodeURIComponent(normalizedPath).replaceAll('/', ' / ').trim() || 'الرئيسية';
  } catch { return path; }
}
function sourceLabel(source: string) {
  if (source === 'direct') return 'دخول مباشر أو رابط محفوظ';
  if (source.includes('google.')) return 'بحث Google';
  if (source.includes('facebook.') || source.includes('fb.')) return 'Facebook';
  if (source.includes('whatsapp.')) return 'WhatsApp';
  return source;
}
function dateLabel(date: string) { return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00Z`)); }
function timeLabel(date: string) { return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date(date)); }
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

function buildSuggestions(analytics: VisitorAnalytics, discovery: DiscoveryInsights, pending: number) {
  const { totals } = analytics;
  const result: Array<{ title: string; text: string; priority: string }> = [];
  if (!totals.lifetimeVisitors) result.push({ title: 'بدأ نظام القياس الآن', text: 'اترك النظام يجمع بيانات فعلية لعدة أيام، ثم قارن الجدد بالعائدين وأعلى الصفحات.', priority: 'بدء' });
  const missedRate = discovery.searchSummary.total ? discovery.searchSummary.missed / discovery.searchSummary.total : 0;
  if (discovery.searchSummary.total >= 10 && missedRate >= .15) result.push({ title: 'بحث بلا نتيجة متكرر', text: `${percentage(missedRate * 100)} من البحث المكتمل خلال ٣٠ يومًا لم يجد نتيجة. ابدأ بأكثر العبارات تكرارًا، وصنّف الفجوات حسب القرية والخدمة قبل جمع البيانات.`, priority: 'عاجل' });
  const pagesPerVisitor = totals.uniqueVisitors30d ? totals.pageViews30d / totals.uniqueVisitors30d : 0;
  if (pagesPerVisitor > 0 && pagesPerVisitor < 1.5) result.push({ title: 'قوِّ الانتقال بين الصفحات', text: 'متوسط الصفحات لكل زائر منخفض؛ أضف روابط أنشطة مشابهة ومسارات تالية أوضح داخل صفحة النشاط.', priority: 'تجربة' });
  const leadingPage = discovery.topPages[0];
  if (leadingPage && leadingPage.views >= 20 && leadingPage.views / Math.max(1, totals.pageViews30d) > .35) result.push({ title: 'استفد من الصفحة الأكثر زيارة', text: `صفحة «${pathLabel(leadingPage.path)}» تجذب نسبة كبيرة من المشاهدات. راجع روابطها الداخلية ووسائل التواصل بها وأضف مسارات مفيدة نحو صفحات مرتبطة.`, priority: 'محتوى' });
  const newShare = totals.uniqueVisitors30d ? totals.newVisitors30d / totals.uniqueVisitors30d : 0;
  if (newShare > .75 && totals.uniqueVisitors30d >= 5) result.push({ title: 'حوّل الجدد إلى زوار عائدين', text: 'نسبة الجدد مرتفعة. أبرز آخر التحديثات والمفضلة ودعوة إنشاء الحساب في نهاية الصفحات الأعلى زيارة.', priority: 'نمو' });
  if (discovery.missedSearches.length) result.push({ title: 'أغلق فجوات البحث', text: `ابدأ بمراجعة طلب «${discovery.missedSearches[0].query}»؛ تكرر ${format(discovery.missedSearches[0].count)} مرات دون نتيجة. تحقّق من توفر الخدمة قبل نشر سجل جديد.`, priority: 'بيانات' });
  if (pending) result.push({ title: 'راجع المساهمات المفتوحة', text: `يوجد ${format(pending)} طلبًا ينتظر المراجعة؛ معالجته تحسن حداثة الدليل وثقة المستخدم.`, priority: 'تشغيل' });
  if (!result.length) result.push({ title: 'حافظ على جودة الصفحات الأعلى', text: 'راجع بيانات الاتصال والخرائط في الصفحات الأكثر زيارة أسبوعيًا، وراقب أي تراجع في الزوار العائدين.', priority: 'جودة' });
  return result.slice(0, 4);
}

export default async function AdminPage() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');
  const [statsResult, analyticsResult, discoveryResult, ownerResponse, moderatorReport, catalog] = await Promise.all([
    getAdminStats(session.accessToken).catch(() => null),
    getVisitorAnalytics(session.accessToken).catch(() => null),
    getDiscoveryInsights(session.accessToken).catch(() => null),
    fetch(`${SUPABASE_URL}/rest/v1/directory_owner_listings?select=status&limit=1000`, { headers: restHeaders(session.accessToken), cache: 'no-store' }).catch(() => null),
    getModeratorOwnerReport(session.accessToken).catch(() => null),
    getPublicBusinessCatalog().catch(() => null),
  ]);
  const ownerStatuses = ownerResponse?.ok ? await ownerResponse.json() as Array<{ status: string }> : [];
  const pendingOwnerCount = ownerStatuses.filter((item) => item.status === 'pending').length;
  const stats = statsResult || { members: 0, siteReviews: 0, siteRating: 0, listingRatings: 0, pendingContributions: 0, events30d: 0 };
  const analytics = analyticsResult || emptyVisitorAnalytics;
  const rawDiscovery = discoveryResult || emptyDiscoveryInsights;
  const discovery = {
    ...rawDiscovery,
    missedSearches: rawDiscovery.missedSearches.filter((item) => isSearchGapOpen(item.query, catalog?.businesses)),
  };
  const totals = analytics.totals;
  const reviewed = businesses.filter((item) => item.checked).length;
  const completion = Math.round((reviewed / Math.max(1, businesses.length)) * 100);
  const pagesPerVisitor = totals.uniqueVisitors30d ? totals.pageViews30d / totals.uniqueVisitors30d : 0;
  const returnRate = totals.uniqueVisitors30d ? (totals.returningVisitors30d / totals.uniqueVisitors30d) * 100 : 0;
  const visitorGrowth = growth(totals.uniqueVisitors30d, totals.previousUniqueVisitors30d);
  const chartMax = Math.max(1, ...analytics.dailySeries.map((item) => item.views));
  const pageMax = Math.max(1, ...analytics.topPages.map((item) => item.views));
  const sourceMax = Math.max(1, ...analytics.sources.map((item) => item.visitors));
  const suggestions = analyticsResult && discoveryResult ? buildSuggestions(analytics, discovery, stats.pendingContributions + pendingOwnerCount) : [];
  const memberCount = statsResult ? format(stats.members) : '—';
  const publishedCount = catalog ? format(catalog.businesses.length) : '—';

  return (
    <main id="main-content" className={`admin-page admin-page--premium ${ownerStyles.dashboard}`}>
      <section className="workspace-hero workspace-hero--admin admin-hero"><div className="shell workspace-hero__grid"><div><span>مركز الإدارة · دليل نقادة</span><h1>كل ما تحتاجه <em>لإدارة الدليل.</em></h1><p>الزيارات والمراجعات وأداء آية في لوحة واحدة؛ الأرقام مأخوذة من السجلات الحية.</p><div className={ownerStyles.heroSignals}><span><b>{analyticsResult ? format(totals.uniqueVisitors30d) : '—'}</b> زائر فريد · ٣٠ يومًا</span><span><b>{ownerResponse?.ok && statsResult ? format(stats.pendingContributions + pendingOwnerCount) : '—'}</b> طلبات متابعة</span><span><b>{moderatorReport ? format(moderatorReport.actions30d) : '—'}</b> إجراء لآية</span></div><div className={ownerStyles.freshness}><span>آخر تحديث {analyticsResult?.generatedAt ? timeLabel(analyticsResult.generatedAt) : 'غير متاح'} · توقيت مصر · تحديث تلقائي كل ٩٠ ثانية</span><AdminLiveRefresh /></div></div><aside><span>جلسة إدارة محمية</span><strong>{session.user.displayName}</strong><small>{session.user.email}</small><div><b><small>القياس</small>٣٠ يومًا</b><b><small>تعريف الزائر</small>متصفح</b><b><small>حالة البيانات</small>{analyticsResult && discoveryResult && statsResult ? 'متاحة' : 'تحتاج مراجعة'}</b></div></aside></div></section>

      <div className="shell admin-shell admin-shell--premium">
        <nav className="admin-section-nav" aria-label="اختصارات لوحة التحكم"><a href="#audience"><b>01</b>الجمهور</a><a href="#discovery"><b>02</b>القياس اليومي</a><a href="#content"><b>03</b>الصفحات والمصادر</a><a href="#members"><b>04</b>الأعضاء الزائرون</a><a href="#recommendations"><b>05</b>التحسين</a><a href="#operations"><b>06</b>التشغيل</a></nav>
        {!analyticsResult || !discoveryResult || !statsResult || !catalog || !ownerResponse?.ok ? <div role="status" className="admin-data-warning">تعذّر تحميل جزء من بيانات اللوحة. الخانات غير المتاحة معروضة بعلامة «—»، ويمكن إعادة المحاولة من زر التحديث.</div> : null}

        <section className="admin-section admin-audience" id="audience"><header><div><span>آخر 30 يومًا</span><h2>الزيارات المسجلة للدليل</h2><p>كل متصفح يُحسب مرة واحدة كزائر فريد، بينما مشاهدة الصفحات تُحسب بشكل مستقل. الأرقام السابقة قد تشمل فحوصات آلية للموقع.</p></div><div className={`admin-growth is-${visitorGrowth.tone}`}><small>مقارنة بالفترة السابقة</small><strong>{visitorGrowth.label}</strong></div></header>
          <div className="admin-primary-metrics"><article><i><MetricIcon name="people" /></i><span>الزوار الفريدون</span><strong>{format(totals.uniqueVisitors30d)}</strong><small>{format(totals.visitorsToday)} زائرًا اليوم</small></article><article><i><MetricIcon name="spark" /></i><span>زوار جدد</span><strong>{format(totals.newVisitors30d)}</strong><small>أول زيارة من هذا المتصفح</small></article><article><i><MetricIcon name="eye" /></i><span>مشاهدات الصفحات</span><strong>{format(totals.pageViews30d)}</strong><small>{pagesPerVisitor.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} صفحة لكل زائر</small></article><article><i><MetricIcon name="member" /></i><span>زوار بأسماء معروفة</span><strong>{format(totals.identifiedVisitors30d)}</strong><small>أعضاء دخلوا بحساباتهم فقط</small></article></div>
          <div className="admin-trend-card"><header><div><span>آخر 14 يومًا</span><h3>اتجاه الزوار والمشاهدات</h3></div><dl><div><dt>العائدون</dt><dd>{format(totals.returningVisitors30d)}</dd></div><div><dt>معدل العودة</dt><dd>{percentage(returnRate)}</dd></div><div><dt>إجمالي الزوار المسجلين</dt><dd>{format(totals.lifetimeVisitors)}</dd></div></dl></header><div className="admin-trend" aria-label="رسم الزيارات اليومية">{analytics.dailySeries.length ? analytics.dailySeries.map((item) => <div key={item.date} title={`${dateLabel(item.date)}: ${format(item.visitors)} زائر و${format(item.views)} مشاهدة`}><span className="admin-trend__bar" style={{ '--bar-height': `${Math.max(item.views ? 8 : 2, (item.views / chartMax) * 100)}%` } as CSSProperties}><i style={{ '--visitor-height': `${Math.max(item.visitors ? 15 : 3, (item.visitors / Math.max(1, item.views)) * 100)}%` } as CSSProperties} /></span><small>{dateLabel(item.date)}</small></div>) : <div className="admin-chart-empty">تبدأ الأعمدة بالظهور مع أول زيارة منشورة.</div>}</div><footer><span><i className="is-views" />المشاهدات</span><span><i className="is-visitors" />الزوار الفريدون</span></footer></div>
        </section>

        <DiscoveryPanel insights={discovery} available={Boolean(discoveryResult)} pathLabel={pathLabel} />

        <section className="admin-section" id="content"><header><div><span>فهم الاهتمام</span><h2>الصفحات والمصادر والأجهزة</h2><p>تعرف أين يذهب الجمهور، ومن أين وصل، وكيف تصفح الدليل.</p></div></header><div className="admin-insight-grid"><article className="admin-ranked-card admin-ranked-card--wide"><header><span>ترتيب المحتوى</span><h3>أكثر الصفحات زيارة</h3></header><RankList type="pages" max={pageMax} items={analytics.topPages.map((item) => ({ label: pathLabel(item.path), value: item.views, detail: `${format(item.visitors)} زائرًا فريدًا` }))} /></article><article className="admin-ranked-card"><header><span>الاكتساب</span><h3>مصادر الوصول</h3></header><RankList type="sources" max={sourceMax} items={analytics.sources.map((item) => ({ label: sourceLabel(item.source), value: item.visitors, detail: 'زائرًا فريدًا' }))} /></article><article className="admin-ranked-card"><header><span>تجربة الأجهزة</span><h3>طريقة التصفح</h3></header><div className="admin-device-list">{analytics.devices.length ? analytics.devices.map((item) => { const share = totals.uniqueVisitors30d ? item.visitors / totals.uniqueVisitors30d * 100 : 0; return <div key={item.device}><span>{item.device === 'mobile' ? 'هاتف جوال' : item.device === 'tablet' ? 'جهاز لوحي' : 'كمبيوتر'}</span><strong>{percentage(share)}</strong><i><span style={{ width: `${share}%` }} /></i><small>{format(item.visitors)} زائرًا</small></div>; }) : <div className="admin-empty">بانتظار بيانات الأجهزة.</div>}</div></article></div></section>

        <section className="admin-section" id="members"><header><div><span>أعضاء دخلوا بحساباتهم</span><h2>الزوار الذين يمكن معرفة أسمائهم</h2><p>لا يمكن معرفة اسم الزائر المجهول. الأسماء التالية تخص أعضاء سجّلوا الدخول ووافقوا على الملف العام.</p></div><small>{format(totals.members30d)} عضوًا جديدًا خلال 30 يومًا</small></header>{analytics.identifiedVisitors.length ? <div className="identified-visitors">{analytics.identifiedVisitors.map((visitor) => <article key={visitor.id}><MemberAvatar name={visitor.name} src={visitor.avatarUrl} frame={visitor.id === moderatorReport?.moderator?.id ? 'gold' : 'gray'} size={48} compact /><div><strong>{visitor.name}</strong>{visitor.bio ? <p>{visitor.bio}</p> : <small>{visitor.locality || 'عضو دليل نقادة'}</small>}<a href={`mailto:${visitor.email}`}>{visitor.email}</a></div><dl><div><dt>آخر ظهور</dt><dd>{timeLabel(visitor.lastSeenAt)}</dd></div><div><dt>مشاهدات</dt><dd>{format(visitor.pageViews)}</dd></div></dl></article>)}</div> : <div className="admin-empty admin-empty--large"><strong>لا يوجد عضو معروف زار الموقع منذ بدء القياس</strong><p>عند دخول عضو بحسابه سيظهر اسمه هنا، بينما تظل الزيارات المجهولة أرقامًا فقط.</p></div>}</section>

        <section id="moderator-performance" className={reportStyles.report} aria-label="أداء المشرفة الذهبية"><header><div><span>فريق الإشراف</span><h2>نشاط آية رفاعي</h2><p>الأرقام من سجل آية الفعلي خلال آخر ٣٠ يومًا · آخر تحديث {moderatorReport?.generatedAt ? timeLabel(moderatorReport.generatedAt) : 'غير متاح'} بتوقيت مصر.</p></div><Link href="/moderator">فتح مساحة الإشراف ←</Link></header>{moderatorReport ? <><div className={reportStyles.summary}><article><span>المشرفة الذهبية</span><div className={reportStyles.moderatorIdentity}><MemberAvatar name={moderatorReport.moderator?.name || 'آية رفاعي'} src={moderatorReport.moderator?.avatarUrl} frame="gold" size={59} /><div><strong>{moderatorReport.moderator?.name || 'لم تُفعّل العضوية بعد'}</strong><small>{moderatorReport.moderator?.status === 'active' ? 'حساب نشط' : moderatorReport.moderator?.status || 'بانتظار التفعيل'}</small></div></div></article><article><span>إجراءات ٣٠ يومًا</span><strong>{format(moderatorReport.actions30d)}</strong><small>مراجعة ونشر وإدارة أعضاء</small></article><article><span>آخر إجراء</span><strong>{moderatorReport.recent.length ? timeLabel(moderatorReport.recent[0].at) : 'لا يوجد بعد'}</strong><small>من سجل المشرفة</small></article></div><div className={reportStyles.details}><div><h3>نوع الإجراءات</h3>{moderatorReport.actionsByType.length ? <ul>{moderatorReport.actionsByType.map((item) => <li key={item.action}><span>{moderatorActionLabel(item.action)}</span><b>{format(item.count)}</b></li>)}</ul> : <p className={reportStyles.empty}>لم تُسجل إجراءات بعد.</p>}</div><div><h3>آخر النشاطات</h3>{moderatorReport.recent.length ? <ul>{moderatorReport.recent.slice(0, 6).map((item, index) => <li key={`${item.at}-${index}`}><span>{moderatorActionLabel(item.action)} · {moderatorKindLabel(item.kind)}</span><small>{timeLabel(item.at)}</small></li>)}</ul> : <p className={reportStyles.empty}>هتظهر هنا أول مراجعة تعملها آية.</p>}</div></div></> : <p className={reportStyles.empty}>تعذّر تحميل سجل المشرفة الآن؛ حدّث الصفحة بعد قليل.</p>}</section>

        <section className="admin-section" id="recommendations"><header><div><span>قرارات قابلة للتنفيذ</span><h2>مقترحات التحسين</h2><p>تتغير هذه الأولويات تلقائيًا حسب سلوك الزوار وجودة البيانات.</p></div></header><div className="admin-recommendations">{!suggestions.length ? <p className="admin-data-warning">مقترحات التحسين متاحة بعد اكتمال تحميل بيانات القياس.</p> : null}{suggestions.map((item, index) => <article key={item.title}><span>{item.priority}</span><b>{String(index + 1).padStart(2, '0')}</b><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>

        <section className="admin-section" id="operations"><header><div><span>نبض التشغيل</span><h2>الأعضاء والتفاعل وجودة الدليل</h2></div><small>{analytics.generatedAt ? `آخر تجميع ${timeLabel(analytics.generatedAt)}` : 'بدأ التجميع الآن'}</small></header><div className="admin-stats admin-stats--expanded"><article><span>الأنشطة المنشورة</span><strong>{publishedCount}</strong><small>داخل {format(categories.length)} قسمًا</small></article><article><span>إجمالي الأعضاء</span><strong>{memberCount}</strong><small>{analyticsResult ? `${format(totals.members7d)} جدد خلال ٧ أيام` : 'من سجلات الأعضاء'}</small></article><article><span>تقييم الموقع</span><strong>{statsResult && stats.siteReviews ? `${stats.siteRating}/5` : '—'}</strong><small>{statsResult ? `${format(stats.siteReviews)} تقييمات` : 'البيانات غير متاحة'}</small></article><article><span>تقييمات الأنشطة</span><strong>{statsResult ? format(stats.listingRatings) : '—'}</strong><small>تقييمات محفوظة</small></article><article><span>طلبات المراجعة</span><strong>{statsResult && ownerResponse?.ok ? format(stats.pendingContributions + pendingOwnerCount) : '—'}</strong><small>قيد المتابعة</small></article><article><span>تفاعل 30 يومًا</span><strong>{statsResult ? format(stats.events30d) : '—'}</strong><small>بحث واتصال وخرائط</small></article></div><div className="admin-operations-grid"><div className="quality-score"><div style={{ '--quality-score': `${completion}%` } as CSSProperties}><strong>{completion}%</strong><span>مراجعة السجلات</span></div><dl><div><dt>السجلات المراجعة</dt><dd>{format(reviewed)}</dd></div><div><dt>المواضع الجغرافية</dt><dd>{format(localities.length)}</dd></div><div><dt>الأقسام النشطة</dt><dd>{format(categories.length)}</dd></div></dl></div><div className="admin-actions"><Link href="/admin/activities"><span>أنشطة الأعضاء الجديدة</span><b>مراجعة الصور والبيانات ←</b></Link><Link href="/contribute?type=correction"><span>طلبات التصحيح</span><b>فتح المساهمات ←</b></Link><Link href="/updates"><span>تحديثات البيانات</span><b>مراجعة آخر السجلات ←</b></Link><Link href="/directory"><span>فحص الدليل العام</span><b>استعراض الأنشطة ←</b></Link><Link href="/account"><span>حساب المدير</span><b>العودة للملف الشخصي ←</b></Link></div></div>{analytics.events.length || discovery.missedSearches.length ? <div className="admin-activity-grid"><article className="admin-ranked-card"><header><span>الأحداث</span><h3>أكثر التفاعلات</h3></header><RankList type="events" max={Math.max(1, ...analytics.events.map((item) => item.count))} items={analytics.events.map((item) => ({ label: eventLabels[item.event] || item.event, value: item.count, detail: 'خلال 30 يومًا' }))} /></article><article className="admin-ranked-card"><header><span>فجوات ما زالت مفتوحة</span><h3>بحث بلا نتيجة حالية</h3></header><RankList type="queries" max={Math.max(1, ...discovery.missedSearches.map((item) => item.count))} items={discovery.missedSearches.map((item) => ({ label: item.query, value: item.count, detail: 'مرات وقت البحث' }))} /></article></div> : null}</section>
      </div>
    </main>
  );
}
