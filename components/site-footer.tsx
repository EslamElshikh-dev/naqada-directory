import { PrivacyPreferences } from './privacy-preferences';
import { NUMBER_LOCALE } from '@/lib/format-number';
import Link from 'next/link';
import { meta } from '@/lib/data';
import { BrandMark } from './site-shell';
import { ActionIcon } from './action-icon';
import { FooterBusinessCount } from './footer-business-count';
import { InstallBanner } from './pwa-setup';
import footerStyles from './site-footer.module.css';

const footerRoutes = [
  { href: '/directory', index: '01', title: 'دليل الخدمات', description: 'ابحث داخل الأنشطة والخدمات المحلية' },
  { href: '/villages', index: '02', title: 'القرى والنجوع', description: 'شوف بلدك والخدمات اللي فيها' },
  { href: '/news', index: '03', title: 'أخبار نقادة وقنا', description: 'آخر الأخبار مع رابط المصدر الأصلي' },
  { href: '/jobs', index: '04', title: 'وظائف نقادة', description: 'فرص شغل وخبرات من أهل البلد' },
  { href: '/knowledge', index: '05', title: 'موسوعة نقادة', description: 'أماكن وأعلام وتراث موثّق' },
  { href: '/blog', index: '06', title: 'حكايات نقادة', description: 'حكاوي وصور من بلدنا وناسها' },
  { href: '/role-models', index: '07', title: 'نماذج مشرفة', description: 'حكايات ناس من نقادة يستحقوا النور' },
];

const footerUtilities = [
  { href: '/activities', label: 'كل الأنشطة' },
  { href: '/updates', label: 'آخر التحديثات' },
  { href: '/coverage', label: 'نطاق التغطية' },
  { href: '/knowledge/references', label: 'مراجع الموسوعة' },
  { href: '/developer', label: 'عن المطوّر' },
  { href: '/account', label: 'حسابي' },
  { href: '/install', label: 'حمّل تطبيق الدليل' },
];

export function Footer() {
  return (
    <footer className={footerStyles.footer}>
      <div className={footerStyles.accent} aria-hidden="true" />
      <div className={`shell ${footerStyles.shell}`}>
        <InstallBanner />
        <section className={footerStyles.masthead} aria-labelledby="site-footer-title">
          <div className={footerStyles.identity}>
            <span className={footerStyles.emblem}><BrandMark /></span>
            <div className={footerStyles.identityCopy}>
              <span className={footerStyles.kicker}>من أهل البلد، لأهل البلد</span>
              <p className={footerStyles.brandTitle} id="site-footer-title">دليل نقادة</p>
              <p>خدمات بلدنا وقراها وحكاوي ناسها في مكان واحد. بندوّر على المعلومة ونراجعها، والدليل يكبر بمشاركة أهل البلد.</p>
            </div>
          </div>
          <div className={footerStyles.actions}>
            <Link prefetch={false} href="/directory" className={footerStyles.primaryAction}><span>دوّر على خدمة</span><ActionIcon name="arrow" /></Link>
            <Link prefetch={false} href="/contribute" className={footerStyles.secondaryAction}><ActionIcon name="add" /><span>عندك إضافة أو تصحيح؟</span></Link>
          </div>
        </section>

        <div className={footerStyles.content}>
          <nav className={footerStyles.routesPanel} aria-labelledby="footer-routes-title">
            <div className={footerStyles.sectionHeading}>
              <div><span>الطريق من هنا</span><h2 id="footer-routes-title">تدوّر على إيه؟</h2></div>
              <small>كل باب يوصّلك لحاجة من بلدنا</small>
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
                <div><span>من أرض نقادة</span><h2 id="footer-metrics-title">بلدنا في الدليل</h2></div>
              </div>
              <div className={footerStyles.stats}>
                <span><b><FooterBusinessCount /></b><small>خدمة ونشاط</small></span>
                <span><b>{meta.localityCount.toLocaleString(NUMBER_LOCALE)}</b><small>قرية وموضعًا</small></span>
                <span><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString(NUMBER_LOCALE)}</b><small>علمًا ومعلمًا</small></span>
              </div>
            </section>

            <section className={footerStyles.localCard} aria-labelledby="footer-scope-title">
              <span className={footerStyles.localIcon} aria-hidden="true"><ActionIcon name="map" /></span>
              <div><strong id="footer-scope-title">نقادة وقراها ونجوعها</strong><p>الدليل مخصص لمركز نقادة في محافظة قنا، وبنراجع بياناته ونحدّثها على قد ما نقدر.</p></div>
              <Link prefetch={false} href="/emergency">أرقام مهمة <ActionIcon name="arrow" /></Link>
            </section>

            <div className={footerStyles.utilities}>
              <h2 id="footer-utilities-title">روابط تهمك</h2>
              <nav className={footerStyles.utilityLinks} aria-labelledby="footer-utilities-title">
                {footerUtilities.map((item) => <Link prefetch={false} href={item.href} key={item.href}>{item.label}<ActionIcon name="arrow" /></Link>)}
              </nav>
            </div>
          </aside>
        </div>

        <PrivacyPreferences />
        <div className={footerStyles.bottom}>
          <div className={footerStyles.bottomInfo}>
            <span className={footerStyles.location}><i aria-hidden="true" /> مركز نقادة · محافظة قنا</span>
            <div className={footerStyles.legal}><span>© {new Date().getFullYear()} دليل نقادة</span><Link prefetch={false} href="/privacy">الخصوصية</Link><Link prefetch={false} href="/about">عن الدليل</Link></div>
          </div>
          <Link prefetch={false} href="/developer" className={footerStyles.signature}><span>تصميم وتطوير</span><b>المهندس إسلام الشيخ</b><span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </footer>
  );
}
