import Link from 'next/link';
import Image from 'next/image';
import { meta } from '@/lib/data';
import { MobileNav } from './mobile-nav';
import { AccountButton } from './auth/account-button';
import { HeaderNav } from './header-nav';
import { ActionIcon } from './action-icon';

export function BrandMark({ compact = false, priority = false }: { compact?: boolean; priority?: boolean }) {
  const size = compact ? 30 : 42;
  return (
    <span className={`brand-mark${compact ? ' brand-mark--compact' : ''}`} aria-hidden="true">
      <Image src="/icon.svg" width={size} height={size} alt="" priority={priority} />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link href="/" className="brand" aria-label="دليل نقادة — الرئيسية">
          <span className="brand__emblem"><BrandMark priority /></span>
          <span className="brand__copy"><strong>دليل نقادة</strong><small>الموسوعة المحلية لمركز نقادة</small></span>
          <span className="brand__scope">قنا</span>
        </Link>
        <HeaderNav />
        <div className="header-actions">
          <Link href="/contribute" className="header-contribute"><ActionIcon name="add" /><span>أضف نشاطًا</span></Link>
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__cta">
        <div><span>الدليل يكبر بمشاركة أهله</span><strong>نشاطك غير موجود أو بياناته تحتاج تحديثًا؟</strong><p>ساعدنا نحافظ على دليل نقادة دقيقًا ومفيدًا للجميع.</p></div>
        <nav><Link href="/contribute" className="button button--light"><ActionIcon name="add" /><span>أضف أو صحح نشاطًا</span></Link><Link href="/#site-reviews" className="button footer__review-button"><ActionIcon name="star" /><span>قيّم تجربتك</span></Link></nav>
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
          <h2>الخدمات والمكان</h2>
          <div className="footer__links">
            <Link href="/directory">كل الأنشطة</Link>
            <Link href="/updates">آخر تحديثات الدليل</Link>
            <Link href="/coverage">خريطة تغطية الدليل</Link>
            <Link href="/villages">القرى والنجوع</Link>
          </div>
        </div>
        <div>
          <h2>الذاكرة والمحتوى</h2>
          <div className="footer__links">
            <Link href="/blog">مدونة دليل نقادة</Link>
            <Link href="/families">السجل العائلي</Link>
            <Link href="/landmarks">معالم نقادة بالصور</Link>
            <Link href="/heritage">الأعلام والمعالم</Link>
            <Link href="/about">عن الدليل ومنهجيته</Link>
          </div>
        </div>
        <div>
          <h2>الحساب والمشاركة</h2>
          <div className="footer__links">
            <Link href="/account">لوحة العضو</Link>
            <Link href="/account/login">تسجيل الدخول</Link>
            <Link href="/contribute">أضف أو صحح بيانات</Link>
            <Link href="/privacy">الخصوصية واستخدام البيانات</Link>
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
