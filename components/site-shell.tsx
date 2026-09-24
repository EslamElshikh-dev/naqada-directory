import Link from 'next/link';
import Image from 'next/image';
import { meta } from '@/lib/data';
import { AccountButton } from './auth/account-button';
import { HeaderNav } from './header-nav';
import { ActionIcon } from './action-icon';
import { GlobalSearch } from './global-search';
import { HeaderNotifications } from './header-notifications';
import footerStyles from './site-footer.module.css';
import headerStyles from './site-header.module.css';
import brandStyles from './brand-mark.module.css';

const footerRoutes = [
  { href: '/directory', index: '01', title: 'دليل الخدمات', description: 'ابحث داخل الأنشطة والخدمات المحلية' },
  { href: '/villages', index: '02', title: 'القرى والنجوع', description: 'شوف بلدك والخدمات اللي فيها' },
  { href: '/news', index: '03', title: 'أخبار نقادة وقنا', description: 'آخر الأخبار مع رابط المصدر الأصلي' },
  { href: '/knowledge', index: '04', title: 'موسوعة نقادة', description: 'أماكن وأعلام وتراث موثّق' },
  { href: '/blog', index: '05', title: 'حكايات نقادة', description: 'حكاوي وصور من بلدنا وناسها' },
  { href: '/role-models', index: '06', title: 'نماذج مشرفة', description: 'حكايات ناس من نقادة يستحقوا النور' },
];

const footerUtilities = [
  { href: '/activities', label: 'كل الأنشطة' },
  { href: '/updates', label: 'آخر التحديثات' },
  { href: '/coverage', label: 'نطاق التغطية' },
  { href: '/knowledge/references', label: 'مراجع الموسوعة' },
  { href: '/developer', label: 'عن المطوّر' },
  { href: '/account', label: 'حسابي' },
];

export function BrandMark({ compact = false, priority = false }: { compact?: boolean; priority?: boolean }) {
  const size = compact ? 30 : 42;
  return (
    <span className={`brand-mark ${brandStyles.mark}${compact ? ` ${brandStyles.compact}` : ''}`} aria-hidden="true">
      <Image src="/icon.svg" width={size} height={size} alt="" loading={priority ? 'eager' : 'lazy'} />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className={headerStyles.header}>
      <div className={`shell ${headerStyles.inner}`}>
        <Link prefetch={false} href="/" className={headerStyles.brand} aria-label="دليل نقادة — الرئيسية">
          <span className={headerStyles.emblem}><BrandMark priority /></span>
          <span className={headerStyles.brandCopy}>
            <small><i aria-hidden="true" /> من أهل البلد</small>
            <strong>دليل نقادة</strong>
          </span>
          <span className={headerStyles.scope}>قنا</span>
        </Link>
        <HeaderNav />
        <div className={headerStyles.actions}>
          <GlobalSearch />
          <HeaderNotifications />
          <AccountButton />
          <Link prefetch={false} href="/emergency" className={headerStyles.emergency} aria-label="أرقام الطوارئ والخدمات المهمة">
            <span className={headerStyles.emergencyDot} aria-hidden="true" />
            <span>أرقام مهمة</span>
          </Link>
          <Link prefetch={false} href="/directory" className={headerStyles.explore}><span>استكشف الدليل</span><ActionIcon name="arrow" /></Link>
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
              <span className={footerStyles.kicker}>من أهل البلد، لأهل البلد</span>
              <h2 id="site-footer-title">دليل نقادة.</h2>
              <p>بلدنا بخدماتها وقراها وحكاويها. نجمع لك المعلومة ونراجعها، والدليل يكبر بينا كلنا. لو عندك معلومة تنفع أهل البلد، ما تبخلش بيها.</p>
            </div>
          </div>
          <div className={footerStyles.actions}>
            <Link prefetch={false} href="/directory" className={footerStyles.primaryAction}><span>استكشف الخدمات</span><ActionIcon name="arrow" /></Link>
            <Link prefetch={false} href="/contribute" className={footerStyles.secondaryAction}><ActionIcon name="add" /><span>أضف أو صحّح معلومة</span></Link>
          </div>
        </section>

        <div className={footerStyles.content}>
          <nav className={footerStyles.routesPanel} aria-labelledby="footer-routes-title">
            <div className={footerStyles.sectionHeading}>
              <div><span>ابدأ من هنا</span><h2 id="footer-routes-title">اختار مشوارك</h2></div>
              <small>من أهنه للي محتاجه</small>
            </div>
            <div className={footerStyles.routes}>
              {footerRoutes.map((route) => (
                <Link prefetch={false} href={route.href} className={footerStyles.route} key={route.href}>
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
              <Link prefetch={false} href="/emergency">أرقام مهمة <ActionIcon name="arrow" /></Link>
            </section>

            <nav className={footerStyles.utilityLinks} aria-label="روابط مساعدة">
              {footerUtilities.map((item) => <Link prefetch={false} href={item.href} key={item.href}>{item.label}</Link>)}
            </nav>
          </aside>
        </div>

        <div className={footerStyles.bottom}>
          <span className={footerStyles.location}><i aria-hidden="true" /> مركز نقادة · محافظة قنا</span>
          <div className={footerStyles.legal}><span>© {new Date().getFullYear()} دليل نقادة</span><Link prefetch={false} href="/privacy">الخصوصية</Link><Link prefetch={false} href="/about">عن الدليل</Link></div>
          <Link prefetch={false} href="/developer" className={footerStyles.signature}><span>تصميم وتطوير</span><b>المهندس إسلام الشيخ</b><span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </footer>
  );
}
