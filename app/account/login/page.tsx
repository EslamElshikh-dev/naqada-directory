import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { LoginForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'تسجيل الدخول', robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main id="main-content" className="auth-page">
      <div className="shell auth-shell">
        <section className="auth-card">
          <Link href="/" className="auth-brand"><BrandMark/><span><strong>دليل نقادة</strong><small>حساب الأعضاء</small></span></Link>
          <div className="auth-heading"><span>مرحبًا بعودتك</span><h1>تسجيل الدخول</h1><p>ادخل إلى حسابك لإدارة ملفك الشخصي والمشاركة في تقييم دليل نقادة.</p></div>
          <LoginForm/>
        </section>
        <aside className="auth-side"><div className="auth-side__mark"><BrandMark/></div><span>مساحة محلية موثوقة</span><h2>عضويتك تقرّبك من كل ما يخص نقادة.</h2><p>ملف شخصي منظم، تقييمات موثوقة، ومساهمات تساعد في تطوير الدليل.</p><div className="auth-side__points"><span>✓ جلسة آمنة</span><span>✓ بياناتك تحت سيطرتك</span><span>✓ وصول أسرع للخدمات</span></div></aside>
      </div>
    </main>
  );
}
