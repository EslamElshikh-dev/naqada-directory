import Link from 'next/link';
import Image from 'next/image';
import { meta } from '@/lib/data';
import { AccountButton } from './auth/account-button';
import { HeaderNav } from './header-nav';
import { ActionIcon } from './action-icon';
import { GlobalSearch } from './global-search';
import { HeaderNotifications } from './header-notifications';

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
        <Link href="/" className="brand site-header__brand" aria-label="دليل نقادة — الرئيسية">
          <span className="brand__emblem"><BrandMark priority /></span>
          <span className="brand__copy"><strong>دليل نقادة</strong><small>الموسوعة المحلية لمركز نقادة</small></span>
          <span className="brand__scope">قنا</span>
        </Link>
        <HeaderNav />
        <div className="header-actions">
          <GlobalSearch />
          <HeaderNotifications />
          <AccountButton />
          <Link href="/emergency" className="header-emergency" aria-label="أرقام الطوارئ والخدمات المهمة">
            <span className="header-emergency__dot" aria-hidden="true" />
            <span>أرقام مهمة</span>
          </Link>
          <Link href="/directory" className="header-contribute"><span>استكشف الدليل</span><ActionIcon name="arrow" /></Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__accent" aria-hidden="true" />
      <div className="shell footer__top">
        <div className="footer__brand-lockup">
          <span className="footer__brand-emblem"><BrandMark /></span>
          <div className="footer__brand-copy">
            <span className="footer__kicker">الموسوعة المحلية لمركز نقادة وقراه</span>
            <h2>دليل وموسوعة نقادة</h2>
            <p>منصة محلية لتنظيم خدمات وأنشطة وقرى مركز نقادة، ضمن تجربة واضحة تساعدك على الوصول إلى المكان والمعلومة بسرعة.</p>
          </div>
        </div>
        <div className="footer__top-actions">
          <span className="footer__scope"><i aria-hidden="true" /> مركز نقادة · قنا</span>
          <Link href="/directory" className="footer__cta"><span>استكشف الدليل</span><b aria-hidden="true">←</b></Link>
        </div>
      </div>

      <div className="shell footer__grid">
        <section className="footer__about" aria-labelledby="footer-stats-title">
          <span className="footer__section-label" id="footer-stats-title">الدليل في أرقام</span>
          <div className="footer__stats">
            <span><b>{meta.businessCount.toLocaleString('ar-EG')}</b> خدمة ونشاط</span>
            <span><b>{meta.localityCount.toLocaleString('ar-EG')}</b> قرية وموضعًا</span>
            <span><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString('ar-EG')}</b> علمًا ومعلمًا</span>
          </div>
          <p className="footer__note">البيانات قابلة للتحديث والمراجعة المستمرة، ويظهر مصدر المعلومة وتاريخ فحصها كلما توفر.</p>
        </section>
        <nav className="footer__column" aria-label="أقسام دليل نقادة">
          <h2>أقسام الدليل</h2>
          <div className="footer__links">
            <Link href="/directory">دليل الخدمات</Link>
            <Link href="/villages">القرى والنجوع</Link>
            <Link href="/knowledge">موسوعة نقادة</Link>
            <Link href="/activities">كل الأنشطة</Link>
          </div>
        </nav>
        <nav className="footer__column" aria-label="اقرأ وشارك">
          <h2>استكشف وشارك</h2>
          <div className="footer__links">
            <Link href="/blog">حكايات نقادة</Link>
            <Link href="/contribute">أضف أو صحّح</Link>
            <Link href="/account">حسابي</Link>
            <Link href="/updates">آخر التحديثات</Link>
          </div>
        </nav>
        <section className="footer__column footer__trust-column" aria-labelledby="footer-trust-title">
          <h2 id="footer-trust-title">معلومات مهمة</h2>
          <div className="footer__trust-card">
            <div className="footer__trust-title"><span aria-hidden="true">✓</span><strong>نطاق محلي واضح</strong></div>
            <p>التغطية مخصصة لمركز نقادة وقراه ونجوعه بمحافظة قنا.</p>
            <Link href="/emergency" className="footer__emergency-link">أرقام الطوارئ والخدمات المهمة</Link>
          </div>
        </section>
      </div>

      <div className="shell footer__bottom">
        <div className="footer__legal"><span>© {new Date().getFullYear()} دليل نقادة</span><span aria-hidden="true">•</span><Link href="/privacy">الخصوصية</Link><span aria-hidden="true">•</span><Link href="/about">عن الدليل</Link></div>
        <a href="https://eslam-elshikh.com/" target="_blank" rel="noreferrer" className="footer__signature"><span>تصميم وتطوير:</span><b>المهندس إسلام الشيخ</b><span aria-hidden="true">↗</span></a>
      </div>
    </footer>
  );
}
