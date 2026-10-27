import type { Metadata } from 'next';
import { BODY_FONT, bodyFontVariable, displayFont } from '@/app/fonts';
import Link from 'next/link';
import './not-found-styles.css';


export const metadata: Metadata = {
  title: { absolute: 'الصفحة غير موجودة | دليل نقادة' },
  description: 'الرابط المطلوب غير موجود في دليل نقادة. ارجع إلى الصفحة الرئيسية أو افتح دليل الخدمات والأنشطة.',
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function GlobalNotFound() {
  return (
    <html lang="ar-EG" dir="rtl" data-body-font={BODY_FONT} className={displayFont.variable + ' ' + bodyFontVariable}>
      <body>
        <main id="main-content" className="not-found shell">
          <span>خطأ 404</span>
          <h1>الصفحة غير موجودة</h1>
          <p>قد يكون الرابط تغيّر، أو أن السجل لم يعد ضمن البيانات المنشورة.</p>
          <div>
            <Link href="/" className="button button--primary">العودة إلى دليل نقادة</Link>
            <Link href="/directory" className="button button--ghost">فتح دليل الخدمات</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
