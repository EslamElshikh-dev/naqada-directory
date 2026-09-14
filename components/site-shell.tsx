import Link from 'next/link';
import Image from 'next/image';
import { meta } from '@/lib/data';
import { AccountButton } from './auth/account-button';
import { HeaderNav } from './header-nav';
import { ActionIcon } from './action-icon';
import { GlobalSearch } from './global-search';

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
          <span className="brand__copy"><strong>دليل نقادة</strong><small>الموسوعة المحلية</small></span>
          <span className="brand__scope">قنا</span>
        </Link>
        <HeaderNav />
        <div className="header-actions">
          <GlobalSearch />
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
      <div className="shell footer__primary">
        <div className="footer__about">
          <Link href="/" className="brand brand--footer"><BrandMark /><span className="brand__copy"><strong>دليل نقادة</strong><small>المكان وأهله، في دليل واحد</small></span></Link>
          <p>موسوعة محلية ودليل خدمات مستقل لمركز نقادة، مكتوب للناس الذين يعيشون المكان ويبحثون عنه.</p>
        </div>
        <div className="footer__action">
          <span>عندك معلومة أحدث؟</span>
          <strong>ساعدنا نخلي الدليل أدق.</strong>
          <Link href="/contribute"><ActionIcon name="add" /><span>أضف أو صحّح بيانات</span></Link>
        </div>
      </div>
      <nav className="shell footer__grid" aria-label="روابط دليل نقادة">
        <div>
          <h2>استكشف</h2>
          <div className="footer__links">
            <Link href="/directory">دليل الخدمات</Link>
            <Link href="/villages">القرى والنجوع</Link>
            <Link href="/knowledge">موسوعة نقادة</Link>
          </div>
        </div>
        <div>
          <h2>اقرأ وشارك</h2>
          <div className="footer__links">
            <Link href="/blog">حكايات نقادة</Link>
            <Link href="/contribute">أضف أو صحّح</Link>
            <Link href="/account">حسابي</Link>
          </div>
        </div>
        <div>
          <h2>معلومات</h2>
          <div className="footer__links">
            <Link href="/about">عن الدليل والمنهجية</Link>
            <Link href="/emergency">أرقام مهمة</Link>
            <Link href="/privacy">الخصوصية</Link>
          </div>
        </div>
      </nav>
      <div className="shell footer__bottom">
        <span>{meta.businessCount.toLocaleString('ar-EG')} خدمة · {meta.localityCount.toLocaleString('ar-EG')} موضعًا · آخر تحديث {meta.updatedAt}</span>
        <span>التصميم والتطوير بواسطة <a href="https://eslam-elshikh.com/" target="_blank" rel="noreferrer">المهندس إسلام الشيخ</a></span>
      </div>
    </footer>
  );
}
