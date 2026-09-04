import Link from 'next/link';
import { categories, meta } from '@/lib/data';
import { MobileNav } from './mobile-nav';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 30 : 42;
  return (
    <span className={`brand-mark${compact ? ' brand-mark--compact' : ''}`} aria-hidden="true">
      <img src="/icon.svg" width={size} height={size} alt="" loading="eager" decoding="async" />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link href="/" className="brand" aria-label="دليل نقادة — الرئيسية">
          <span className="brand__emblem"><BrandMark /></span>
          <span className="brand__copy"><strong>دليل نقادة</strong><small>الموسوعة المحلية لمركز نقادة</small></span>
          <span className="brand__scope">قنا</span>
        </Link>
        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          <Link href="/">الرئيسية</Link>
          <Link href="/directory">الدليل</Link>
          <Link href="/updates">آخر التحديثات</Link>
          <Link href="/blog">المدونة</Link>
          <Link href="/villages">القرى والنجوع</Link>
          <Link href="/families">العائلات</Link>
          <Link href="/heritage">الأعلام والمعالم</Link>
          <Link href="/about">عن الدليل</Link>
        </nav>
        <Link href="/emergency" className="header-alert">أرقام مهمة</Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__motto">
        <span>نقادة · قنا</span>
        <strong>دليل للمكان، وذاكرة للناس، وخدمات أقرب لليوم.</strong>
        <Link href="/about">اعرف حكاية الدليل ←</Link>
      </div>
      <div className="shell footer__grid">
        <div className="footer__about">
          <Link href="/" className="brand brand--footer"><BrandMark /><span className="brand__copy"><strong>دليل نقادة</strong><small>خدمات ومكان وذاكرة محلية في دليل واحد</small></span></Link>
          <p>منصة معلوماتية مستقلة تنظّم البيانات القابلة للنشر عن مركز نقادة. ظهور أي نشاط لا يُعد اعتمادًا رسميًا أو ضمانًا للخدمة.</p>
          <div className="footer__stats">
            <span><b>{meta.businessCount.toLocaleString('ar-EG')}</b> نشاطًا</span>
            <span><b>{meta.localityCount.toLocaleString('ar-EG')}</b> موضعًا</span>
            <span><b>{meta.familyCount.toLocaleString('ar-EG')}</b> سجلًا عائليًا</span>
          </div>
        </div>
        <div>
          <h2>استكشف</h2>
          <div className="footer__links">
            <Link href="/directory">كل الأنشطة</Link>
            <Link href="/updates">آخر تحديثات الدليل</Link>
            <Link href="/blog">مدونة دليل نقادة</Link>
            <Link href="/coverage">خريطة تغطية الدليل</Link>
            <Link href="/contribute">أضف نشاطًا أو صحح بيانات</Link>
            <Link href="/villages">القرى والنجوع</Link>
            <Link href="/families">السجل العائلي</Link>
            <Link href="/heritage">الأعلام والمعالم</Link>
            <Link href="/privacy">الخصوصية واستخدام البيانات</Link>
          </div>
        </div>
        <div>
          <h2>أقسام شائعة</h2>
          <div className="footer__links">
            {categories.slice(0, 5).map((category) => <Link key={category.slug} href={`/directory/${category.slug}`}>{category.shortLabel}</Link>)}
          </div>
        </div>
      </div>
      <div className="shell footer__bottom">
        <span>آخر تحديث للبيانات: {meta.updatedAt}</span>
        <span>التصميم والتطوير بواسطة <a href="https://eslam-elshikh.com/" target="_blank" rel="noreferrer">المهندس إسلام الشيخ</a></span>
      </div>
      <MobileNav />
    </footer>
  );
}
