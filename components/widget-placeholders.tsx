import Link from 'next/link';
import Image from 'next/image';
import { DeferredWidget } from './deferred-widgets';
import type { FeaturedRoleModel } from './role-model-feature';
import ticker from './updates-ticker.module.css';
import notifications from './notification-trigger.module.css';
import sanad from './sanad-launcher.module.css';
import feature from './role-model-feature.module.css';
const fallbackUpdates = [
  { href: '/jobs', tag: 'فرص البلد', text: 'عندك وظيفة أو بتدور على شغل؟ باب الرزق من هنا' },
  { href: '/news', tag: 'الأخبار', text: 'تابع أخبار نقادة وقنا من مصادرها الصحفية والرسمية' },
  { href: '/updates', tag: 'تحديث', text: 'مراجعة أحدث بيانات الأنشطة والخدمات داخل دليل نقادة' },
  { href: '/directory', tag: 'تصميم', text: 'تطوير بطاقات الدليل وتجربة التصفح على الجوال والكمبيوتر' },
  { href: '/knowledge', tag: 'الموسوعة', text: 'توسعة صفحات الأماكن والأعلام والتراث المحلي في مركز نقادة' },
  { href: '/search', tag: 'البحث', text: 'تحسين البحث الموحّد للوصول إلى النشاط أو القرية أو المعلومة بسرعة' },
  { href: '/contribute', tag: 'شاركنا', text: 'إضافة مسار واضح لإرسال نشاط أو تصحيح موثّق ومراجعته قبل النشر' },
  { href: '/updates', tag: 'سند', text: 'تطوير المساعد الذكي سند وتحسين وصوله السريع على الهاتف' },
];
export function DeferredTicker() { return <DeferredWidget kind="ticker"><section className={ticker.root} data-paused={false} dir="rtl" aria-label="آخر أخبار وتحديثات دليل نقادة">
      <Link prefetch={false} href="/news" className={ticker.heading}>
        <i aria-hidden="true" />
        <span><small>نبض نقادة</small><strong>الأخبار الآن</strong></span>
      </Link>

      <div className={ticker.viewport}>
        <div className={ticker.track}>
          <div className={ticker.group}>
            {fallbackUpdates.map((item) => (
              <Link prefetch={false} className={ticker.item} href={item.href} key={`${item.tag}-${item.href}-${item.text}`}>
                <span>{item.tag}</span>
                <strong>{item.text}</strong>
                <b aria-hidden="true">←</b>
              </Link>
            ))}
          </div>
          <div className={`${ticker.group} ${ticker.clone}`} aria-hidden="true">
            {fallbackUpdates.map((item) => (
              <Link prefetch={false} tabIndex={-1} className={ticker.item} href={item.href} key={`clone-${item.tag}-${item.href}-${item.text}`}>
                <span>{item.tag}</span>
                <strong>{item.text}</strong>
                <b aria-hidden="true">←</b>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={ticker.control}
        aria-pressed={false}
        aria-label="إيقاف الشريط"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
      </button>
    </section></DeferredWidget>; }
export function DeferredNotifications() { return <DeferredWidget kind="notifications"><div className={notifications.root}><button type="button" className={notifications.trigger} aria-label="عرض الإشعارات" aria-expanded={false} aria-controls="header-notifications-panel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9Z"/><path d="M9.7 20h4.6"/></svg></button></div></DeferredWidget>; }
export function DeferredSanad() { return <DeferredWidget kind="sanad"><div className={sanad.root} dir="rtl" data-open={false}><button className={sanad.launcher} aria-label="افتح محادثة سند، مساعد دليل نقادة" aria-expanded={false} aria-controls="sanad-panel"><span className={sanad.avatar}><Image src="/images/assistant/sanad.webp" alt="سند، شاب بزي صعيدي" width={58} height={58} sizes="58px"/></span><span className={sanad.mobileLabel} aria-hidden="true">سند</span></button></div></DeferredWidget>; }
export function DeferredPreferences() { return <DeferredWidget kind="preferences"><section className="privacy-preferences" aria-labelledby="marketing-choice-title">
    <h2 id="marketing-choice-title">تفضيلات قياس الإعلانات</h2>
    <p>نحمّل Meta Pixel بعد موافقتك لقياس زيارات الحملات. يمكنك تغيير الاختيار هنا في أي وقت.</p>
    <div className="detail-actions">
      <button type="button" className="button button--ghost" aria-pressed={false}>السماح بقياس Meta</button>
      <button type="button" className="button button--ghost" aria-pressed={false}>رفض القياس</button>
      <span role="status">لم تختر بعد؛ قياس Meta متوقف</span>
    </div>
  </section></DeferredWidget>; }
export function DeferredRoleModelFeature({ people }: { people: FeaturedRoleModel[] }) { if (!people.length) return null; const person=people[0], activeIndex=0, autoPlaying=true, announcement=""; return <DeferredWidget kind="feature" people={people}><section
    className={'shell ' + feature.homeFeature}
    aria-labelledby="home-role-model-title"
  >
    <div className={feature.homeFeatureCopy}>
      <div key={person.slug} className={feature.homeFeatureSlideCopy}>
        <span>نماذج مشرفة · من أهل نقادة</span>
        <h2 id="home-role-model-title">{person.name}</h2>
        <p>{person.shortTitle}.</p>
        <Link prefetch={false} href={'/role-models/' + person.slug}>اقرأ الحكاية <span aria-hidden="true">←</span></Link>
        <Link prefetch={false} href="/role-models" className={feature.homeSecondary}>كل النماذج المشرفة</Link>
      </div>
      {people.length > 1 && <div className={feature.featureControls} aria-label="التنقل بين النماذج المشرفة">
        <span className={feature.featureCount} aria-hidden="true">{String(activeIndex + 1).padStart(2, '0')} <span>/</span> {String(people.length).padStart(2, '0')}</span>
        <div className={feature.featureButtons}>
          <button type="button" aria-label="الشخصية السابقة">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" aria-label="الشخصية التالية">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" aria-label={autoPlaying ? 'إيقاف العرض التلقائي' : 'تشغيل العرض التلقائي'} aria-pressed={!autoPlaying}>
            {autoPlaying
              ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 4.8a1 1 0 0 1 1.52-.85l11 7.2a1 1 0 0 1 0 1.7l-11 7.2A1 1 0 0 1 7 19.2V4.8Z" /></svg>}
          </button>
        </div>
      </div>}
      <span className={feature.featureAnnouncement} aria-live="polite" aria-atomic="true">{announcement}</span>
    </div>
    <div key={person.slug} className={feature.homeFeatureVisual}>
      {person.photo
        ? <Image unoptimized={person.photo.src.startsWith('/api/article-media/')} src={person.photo.src} alt={person.photo.alt} width={person.photo.width} height={person.photo.height} sizes="(max-width: 700px) calc(100vw - 32px), 32vw" style={person.photo.cardPosition ? { objectPosition: person.photo.cardPosition } : undefined} />
        : <span className={feature.monogram} aria-hidden="true">{person.name.slice(0, 1)}</span>}
      <small>{person.name} · {person.locality}</small>
    </div>
  </section></DeferredWidget>; }
