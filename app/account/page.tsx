import type { Metadata } from 'next';
import Link from 'next/link';
import { MemberDashboard } from '@/components/auth/member-dashboard';

export const metadata: Metadata = { title: 'لوحة العضو', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function AccountPage() {
  return (
    <main id="main-content" className="account-page">
      <section className="workspace-hero workspace-hero--member">
        <div className="shell workspace-hero__grid"><div><span>مساحة العضو</span><h1>حسابك داخل <em>دليل نقادة</em></h1><p>حدّث بياناتك، شارك رأيك، واستكشف الخدمات من لوحة واحدة مصممة لك.</p><nav><a href="#profile">الملف الشخصي</a><Link href="/#site-reviews">تقييم الدليل</Link><Link href="/contribute">إضافة أو تصحيح نشاط</Link></nav></div><aside><span>مركز العضوية</span><strong>هويتك المحلية في مكان واحد</strong><div><b>01<small>ملف منظم</small></b><b>02<small>رأي موثق</small></b><b>03<small>وصول أسرع</small></b></div></aside></div>
      </section>
      <div className="shell account-shell"><MemberDashboard/></div>
    </main>
  );
}
