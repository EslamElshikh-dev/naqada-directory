import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { RegisterForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'إنشاء حساب عضو', robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <main id="main-content" className="auth-page">
      <div className="shell auth-shell">
        <section className="auth-card">
          <Link href="/" className="auth-brand"><BrandMark/><span><strong>دليل نقادة</strong><small>عضوية جديدة</small></span></Link>
          <div className="auth-heading"><span>انضم إلى المجتمع</span><h1>إنشاء حساب عضو</h1><p>حساب واحد آمن لتقييم الدليل وإدارة ملفك والاستفادة من مزايا الأعضاء.</p></div>
          <RegisterForm/>
        </section>
        <aside className="auth-side auth-side--register"><div className="auth-side__mark"><BrandMark/></div><span>ابدأ من هنا</span><h2>ملفك المحلي بصورة أرتب وأوضح.</h2><p>أضف اسمك وموضعك ونبذة قصيرة، وشارك رأيك باسم عضو مؤكد.</p><div className="auth-side__points"><span>01 ملف شخصي</span><span>02 تقييمات حقيقية</span><span>03 مساهمة محلية</span></div></aside>
      </div>
    </main>
  );
}
