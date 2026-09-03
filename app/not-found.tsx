import Link from 'next/link';

export default function NotFound() {
  return <main id="main-content" className="not-found shell"><span>404</span><h1>الصفحة غير موجودة</h1><p>قد يكون الرابط تغيّر أو أن السجل لم يعد ضمن البيانات المنشورة.</p><div><Link href="/" className="button button--primary">العودة للرئيسية</Link><Link href="/directory" className="button button--ghost">فتح الدليل</Link></div></main>;
}
