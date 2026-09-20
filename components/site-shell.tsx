import Link from 'next/link';
import Image from 'next/image';
import { meta } from '@/lib/data';
import { AccountButton } from './auth/account-button';
import { HeaderNav } from './header-nav';
import { ActionIcon } from './action-icon';
import { GlobalSearch } from './global-search';
import { HeaderNotifications } from './header-notifications';
import footerStyles from './site-footer.module.css';

const footerRoutes = [
  { href: '/directory', index: '01', title: 'دليل الخدمات', description: 'ابحث داخل الأنشطة والخدمات المحلية' },
  { href: '/villages', index: '02', title: 'القرى والنجوع', description: 'افتح صفحة قريتك ومحتواها المحلي' },
  { href: '/news', index: '03', title: 'أخبار نقادة وقنا', description: 'آخر الأخبار مع رابط المصدر الأصلي' },
  { href: '/knowledge', index: '04', title: 'موسوعة نقادة', description: 'أماكن وأعلام وتراث موثّق' },
  { href: '/blog', index: '05', title: 'حكايات نقادة', description: 'قصص وصور من ذاكرة المكان' },
];

const footerUtilities = [
  { href: '/activities', label: 'كل الأنشطة' },
  { href: '/updates', label: 'آخر التحديثات' },
  { href: '/coverage', label: 'نطاق التغطية' },
  { href: '/knowledge/references', label: 'مراجع الموسوعة' },
  { href: '/knowledge/developer', label: 'عن المطوّر' },
  { href: '/account', label: 'حسابي' },
];

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
    <footer className={footerStyles.footer}>
      <div className={footerStyles.accent} aria-hidden="true" />
      <div className={`shell ${footerStyles.shell}`}>
        <section className={footerStyles.masthead} aria-labelledby="site-footer-title">
          <div className={footerStyles.identity}>
            <span className={footerStyles.emblem}><BrandMark /></span>
            <div className={footerStyles.identityCopy}>
              <span className={footerStyles.kicker}>مرجعك المحلي داخل مركز نقادة</span>
              <h2 id="site-footer-title">كل نقادة… في مساحة واحدة واضحة.</h2>
              <p>دليل خدمات وموسوعة مكانية تجمع الأنشطة والقرى والحكايات، وتساعدك على الوصول للمعلومة الصحيحة بأقل عدد من الخطوات.</p>
            </div>
          </div>
          <div className={footerStyles.actions}>
            <Link href="/directory" className={footerStyles.primaryAction}><span>استكشف الخدمات</span><ActionIcon name="arrow" /></Link>
            <Link href="/contribute" className={footerStyles.secondaryAction}><ActionIcon name="add" /><span>أضف أو صحّح معلومة</span></Link>
          </div>
        </section>

        <div className={footerStyles.content}>
          <nav className={footerStyles.routesPanel} aria-labelledby="footer-routes-title">
            <div className={footerStyles.sectionHeading}>
              <div><span>ابدأ من هنا</span><h2 id="footer-routes-title">مسارات سريعة</h2></div>
              <small>اختصر طريقك داخل الدليل</small>
            </div>
            <div className={footerStyles.routes}>
              {footerRoutes.map((route) => (
                <Link href={route.href} className={footerStyles.route} key={route.href}>
                  <span className={footerStyles.routeIndex}>{route.index}</span>
                  <span className={footerStyles.routeCopy}><strong>{route.title}</strong><small>{route.description}</small></span>
                  <ActionIcon name="arrow" />
                </Link>
              ))}
            </div>
          </nav>

          <aside className={footerStyles.side} aria-label="معلومات دليل نقادة">
            <section className={footerStyles.metrics} aria-labelledby="footer-metrics-title">
              <div className={footerStyles.sectionHeading}>
                <div><span>تغطية محلية متجددة</span><h2 id="footer-metrics-title">الدليل في أرقام</h2></div>
              </div>
              <div className={footerStyles.stats}>
                <span><b>{meta.businessCount.toLocaleString('ar-EG')}</b><small>خدمة ونشاط</small></span>
                <span><b>{meta.localityCount.toLocaleString('ar-EG')}</b><small>قرية وموضعًا</small></span>
                <span><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString('ar-EG')}</b><small>علمًا ومعلمًا</small></span>
              </div>
            </section>

            <section className={footerStyles.localCard} aria-labelledby="footer-scope-title">
              <span className={footerStyles.localIcon} aria-hidden="true">✓</span>
              <div><strong id="footer-scope-title">محتوى محلي بنطاق واضح</strong><p>التغطية مخصصة لمركز نقادة وقراه ونجوعه بمحافظة قنا، مع مراجعة البيانات وتحديثها باستمرار.</p></div>
              <Link href="/emergency">أرقام مهمة <ActionIcon name="arrow" /></Link>
            </section>

            <nav className={footerStyles.utilityLinks} aria-label="روابط مساعدة">
              {footerUtilities.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
            </nav>
          </aside>
        </div>

        <div className={footerStyles.bottom}>
          <span className={footerStyles.location}><i aria-hidden="true" /> مركز نقادة · محافظة قنا</span>
          <div className={footerStyles.legal}><span>© {new Date().getFullYear()} دليل نقادة</span><Link href="/privacy">الخصوصية</Link><Link href="/about">عن الدليل</Link></div>
          <Link href="/knowledge/developer" className={footerStyles.signature}><span>تصميم وتطوير</span><b>المهندس إسلام الشيخ</b><span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </footer>
  );
}
