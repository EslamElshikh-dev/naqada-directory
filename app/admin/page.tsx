import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businesses, categories, localities, meta } from '@/lib/data';
import { getAdminStats, isDirectoryAdmin } from '@/lib/auth/admin';
import { resolveSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'لوحة إدارة الدليل', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function format(value: number) { return value.toLocaleString('ar-EG'); }

export default async function AdminPage() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');
  const stats = await getAdminStats(session.accessToken).catch(() => ({ members: 0, siteReviews: 0, siteRating: 0, listingRatings: 0, pendingContributions: 0, events30d: 0 }));
  const reviewed = businesses.filter((item) => item.checked).length;
  const completion = Math.round((reviewed / Math.max(1, businesses.length)) * 100);
  return (
    <main id="main-content" className="admin-page">
      <section className="workspace-hero workspace-hero--admin"><div className="shell workspace-hero__grid"><div><span>مركز تشغيل الدليل</span><h1>لوحة إدارة <em>دليل نقادة</em></h1><p>قراءة سريعة للنمو، العضويات، التقييمات، المساهمات وجودة بيانات الأنشطة.</p><nav><a href="#overview">ملخص الأداء</a><a href="#quality">جودة البيانات</a><a href="#operations">التشغيل</a></nav></div><aside><span>جلسة إدارة محمية</span><strong>{session.user.displayName}</strong><small>{session.user.email}</small><div><b>موثقة</b><b>غير مفهرسة</b><b>صلاحية مالك</b></div></aside></div></section>
      <div className="shell admin-shell">
        <section className="admin-section" id="overview"><header><div><span>نظرة عامة</span><h2>أداء الدليل الآن</h2></div><small>بيانات مباشرة من قاعدة المشروع</small></header><div className="admin-stats"><article><span>الأنشطة المنشورة</span><strong>{format(meta.businessCount)}</strong><small>داخل {format(categories.length)} قسمًا</small></article><article><span>الأعضاء</span><strong>{format(stats.members)}</strong><small>حسابات مسجلة</small></article><article><span>تقييم الموقع</span><strong>{stats.siteReviews ? `${stats.siteRating}/5` : '—'}</strong><small>{format(stats.siteReviews)} تقييمات</small></article><article><span>تقييمات الأنشطة</span><strong>{format(stats.listingRatings)}</strong><small>تقييمات زوار محفوظة</small></article><article><span>طلبات المراجعة</span><strong>{format(stats.pendingContributions)}</strong><small>قيد المتابعة</small></article><article><span>تفاعل 30 يومًا</span><strong>{format(stats.events30d)}</strong><small>بحث واتصالات وخرائط</small></article></div></section>

        <div className="admin-columns"><section className="admin-section" id="quality"><header><div><span>سلطة البيانات</span><h2>جودة وتغطية الدليل</h2></div></header><div className="quality-score"><div style={{ '--quality-score': `${completion}%` } as React.CSSProperties}><strong>{completion}%</strong><span>مراجعة السجلات</span></div><dl><div><dt>السجلات المراجعة</dt><dd>{format(reviewed)}</dd></div><div><dt>المواضع الجغرافية</dt><dd>{format(localities.length)}</dd></div><div><dt>الأقسام النشطة</dt><dd>{format(categories.length)}</dd></div></dl></div></section><section className="admin-section" id="operations"><header><div><span>وصول سريع</span><h2>أدوات التشغيل</h2></div></header><div className="admin-actions"><Link href="/contribute"><span>طلبات الإضافة والتصحيح</span><b>فتح نموذج المساهمات ←</b></Link><Link href="/updates"><span>تحديثات البيانات</span><b>مراجعة آخر السجلات ←</b></Link><Link href="/directory"><span>فحص الدليل العام</span><b>استعراض الأنشطة ←</b></Link><Link href="/account"><span>حساب المدير</span><b>العودة للملف الشخصي ←</b></Link></div></section></div>
      </div>
    </main>
  );
}
