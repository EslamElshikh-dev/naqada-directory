import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { DeveloperWorkShowcase } from '@/components/developer-work-showcase';
import { developerProjects } from '@/lib/developer-profile';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import styles from './developer.module.css';

const pagePath = '/developer';
const portraitPath = '/images/eslam-elshikh.jpg';

export const metadata: Metadata = buildPageMetadata({
  title: 'المهندس إسلام الشيخ | ابن العسيرات ومطور دليل نقادة',
  description: 'المهندس إسلام الشيخ، مهندس أمن سيبراني ومطور في جوجل. من مواليد الرياض وابن مركز العسيرات بسوهاج، وله أعمال في السوق السعودي ومشروعات رقمية منها دليل العسيرات ودليل نقادة.',
  path: pagePath,
  keywords: ['إسلام الشيخ', 'المهندس إسلام الشيخ', 'مطور دليل نقادة', 'دليل العسيرات', 'العسيرات سوهاج', 'أمن سيبراني'],
  socialImage: { url: `${siteConfig.url}${portraitPath}`, alt: 'المهندس إسلام الشيخ، مطوّر دليل نقادة' },
});

const stops = [
  { number: '٠١', title: 'مواليد الرياض', detail: 'مواليد مدينة الرياض بالمملكة العربية السعودية، يوم ٢١ أبريل ١٩٩٨.' },
  { number: '٠٢', title: 'ابن العسيرات', detail: 'ابن مركز العسيرات بمحافظة سوهاج في مصر.' },
  { number: '٠٣', title: 'هندسة الحاسبات والمعلومات', detail: 'بكالوريوس هندسة الحاسبات والمعلومات من جامعة ٦ أكتوبر.' },
  { number: '٠٤', title: 'الأمن السيبراني', detail: 'دبلومة الأمن السيبراني من الجامعة العربية المفتوحة.' },
];

const approach = [
  { number: '١', title: 'في المقاولات والعقارات', detail: 'عمل مع شركة تعاود للمقاولات العامة بفرعيها في الرياض والدمام، وشركة الأرجان العقارية.' },
  { number: '٢', title: 'في الخدمات الصحية', detail: 'عمل مع معامل سما سكان للأشعة التشخيصية في الرياض.' },
  { number: '٣', title: 'في الذكاء الاصطناعي', detail: 'عمل مع شركة باودي لابز للذكاء الاصطناعي، إلى جانب مشروعات أخرى.' },
];

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${siteConfig.url}${pagePath}/#profile`,
      url: `${siteConfig.url}${pagePath}/`,
      name: 'المهندس إسلام الشيخ — عن المطوّر',
      mainEntity: { '@id': `${siteConfig.url}${pagePath}/#eslam-elshikh` },
    },
    {
      '@type': 'Person',
      '@id': `${siteConfig.url}${pagePath}/#eslam-elshikh`,
      name: 'إسلام الشيخ',
      alternateName: ['Eslam Elshikh', 'Islam Elshikh'],
      birthDate: '1998-04-21',
      birthPlace: { '@type': 'Place', name: 'الرياض، المملكة العربية السعودية' },
      homeLocation: { '@type': 'Place', name: 'مركز العسيرات، محافظة سوهاج، مصر' },
      alumniOf: [
        { '@type': 'CollegeOrUniversity', name: 'جامعة ٦ أكتوبر' },
        { '@type': 'CollegeOrUniversity', name: 'الجامعة العربية المفتوحة' },
      ],
      image: `${siteConfig.url}${portraitPath}`,
      url: 'https://www.eslam-elshikh.com/',
      jobTitle: ['مهندس أمن سيبراني', 'مطور في جوجل'],
      knowsAbout: ['Cybersecurity', 'Web Development', 'Local Search'],
      sameAs: [
        'https://www.eslam-elshikh.com/',
        'https://github.com/EslamElshikh-dev',
        'https://me.developers.google.com/u/EslamElshikh',
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${siteConfig.url}/` },
        { '@type': 'ListItem', position: 2, name: 'عن المطوّر', item: `${siteConfig.url}${pagePath}/` },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'مشروعات مختارة للمهندس إسلام الشيخ',
      numberOfItems: developerProjects.length,
      itemListElement: developerProjects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: project.title,
        url: project.external ? project.href : `${siteConfig.url}${project.href}`,
      })),
    },
  ],
};

export default function DeveloperPage() {
  return (
    <main id="main-content" className={`page-main ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="developer-title">
        <div className={`shell ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <nav className={styles.breadcrumbs} aria-label="مسار الصفحة"><Link href="/">دليل نقادة</Link><span aria-hidden="true">/</span><span>عن المطوّر</span></nav>
            <p className={styles.eyebrow}><span aria-hidden="true">✦</span> عن المطوّر</p>
            <h1 id="developer-title">المهندس إسلام الشيخ.<br /><em>ابن العسيرات، سوهاج.</em></h1>
            <p className={styles.heroLead}>مهندس أمن سيبراني ومطور في جوجل. من مواليد مدينة الرياض بالمملكة العربية السعودية، وابن مركز العسيرات بمحافظة سوهاج في مصر.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#story">تعرّف عليّ <span aria-hidden="true">↓</span></a>
              <a className={styles.secondaryAction} href="#selected-work">شوف أعمالي <span aria-hidden="true">←</span></a>
            </div>
            <p className={styles.heroAside}>الرياض، المملكة العربية السعودية <span aria-hidden="true">·</span> العسيرات، محافظة سوهاج</p>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.portraitFrame}>
              <Image src={portraitPath} alt="صورة المهندس إسلام الشيخ" fill priority sizes="(max-width: 840px) 86vw, 42vw" />
              <span className={styles.portraitCaption}>إسلام الشيخ <small>مهندس أمن سيبراني ومطور</small></span>
            </div>
            <div className={styles.placeBadge}><span>الرياض</span><i aria-hidden="true">↔</i><span>العسيرات</span></div>
            <span className={styles.visualMark} aria-hidden="true">إس</span>
          </div>
        </div>
      </section>

      <nav className={styles.chapterNav} aria-label="أقسام صفحة المطوّر">
        <div className="shell"><span>في الصفحة</span><a href="#story">عني</a><a href="#journey">منين بدأت</a><a href="#selected-work">المشروعات</a><a href="#connect">تواصل</a></div>
      </nav>

      <section id="story" className={`shell ${styles.story}`} aria-labelledby="story-title">
        <div className={styles.sectionIndex}><span>عني</span><i /></div>
        <div className={styles.storyCopy}>
          <p className={styles.kicker}>المهندس إسلام الشيخ</p>
          <h2 id="story-title">مواليد الرياض،<br /><em>وابن العسيرات.</em></h2>
          <p>المهندس إسلام الشيخ، مواليد مدينة الرياض بالمملكة العربية السعودية يوم ٢١ أبريل ١٩٩٨، وابن مركز العسيرات بمحافظة سوهاج في مصر.</p>
          <p>حاصل على بكالوريوس هندسة الحاسبات والمعلومات من جامعة ٦ أكتوبر، ودبلومة الأمن السيبراني من الجامعة العربية المفتوحة. <strong>مهندس أمن سيبراني ومطور في جوجل.</strong></p>
          <p>المهندس إسلام الشيخ أحد أبرز الكوادر المصرية الشابة في مجال الأمن السيبراني والبرمجة في السوق السعودي، وبرز بقوة نهاية عام ٢٠٢٥.</p>
          <div className={styles.recognition}>
            <div className={styles.recognitionNumber}><span>أفضل</span><strong>١٠</strong><span>مطورين عرب مستقلين</span></div>
            <div className={styles.recognitionCopy}>
              <p className={styles.recognitionEyebrow}>الترتيب المحلي · نهاية ٢٠٢٥</p>
              <p>وهو ضمن الكوادر المصرية والعربية النادرة المعتمدة والعاملة لدى جوجل، ويعتبر من أفضل ١٠ مطورين عرب مستقلين في الترتيب المحلي.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="journey" className={styles.journey} aria-labelledby="journey-title">
        <div className={`shell ${styles.journeyInner}`}>
          <header className={styles.journeyHeader}><p className={styles.kicker}>البداية والدراسة</p><h2 id="journey-title">من الرياض للعسيرات،<br /><em>ومن الدراسة للشغل.</em></h2></header>
          <ol className={styles.timeline}>{stops.map((stop) => <li key={stop.number}><span className={styles.timelineNumber}>{stop.number}</span><div><h3>{stop.title}</h3><p>{stop.detail}</p></div></li>)}</ol>
        </div>
      </section>

      <section className={`shell ${styles.perspective}`} aria-labelledby="perspective-title">
        <div className={styles.perspectiveIntro}>
          <p className={styles.kicker}>خبرة في السوق السعودي</p>
          <h2 id="perspective-title">شغل في مجالات مختلفة،<br /><em>وجذور في الصعيد.</em></h2>
          <p>عمل مع شركات كبرى تحقق نجاحات استثنائية، مثل شركة تعاود للمقاولات العامة بفرعي الرياض والدمام، وشركة الأرجان العقارية الضخمة، ومعامل سما سكان للأشعة التشخيصية في الرياض، وشركة باودي لابز للذكاء الاصطناعي، وغيرهم.</p>
          <a href="https://me.developers.google.com/u/EslamElshikh" target="_blank" rel="noreferrer">ملفي على Google للمطورين <span aria-hidden="true">↗</span></a>
        </div>
        <div className={styles.approachGrid}>{approach.map((item) => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </section>

      <DeveloperWorkShowcase />

      <section id="connect" className={`shell ${styles.connect}`} aria-labelledby="connect-title">
        <div className={styles.connectMark} aria-hidden="true">إس</div>
        <div>
          <p className={styles.kicker}>للتواصل ومتابعة الأعمال</p>
          <h2 id="connect-title">تحب تعرف أكتر عن شغلي؟<br /><em>اتفضل من هنا.</em></h2>
          <p>موقعي الشخصي ومشروعاتي على GitHub لو حابب تشوف أعمال تانية غير اللي هنا.</p>
          <div className={styles.connectLinks}>
            <a href="https://www.eslam-elshikh.com/" target="_blank" rel="noreferrer me">موقعي الشخصي <span aria-hidden="true">↗</span></a>
            <a href="https://github.com/EslamElshikh-dev" target="_blank" rel="noreferrer me">مشروعاتي على GitHub <span aria-hidden="true">↗</span></a>
            <Link href="/about">عن دليل نقادة <span aria-hidden="true">←</span></Link>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(schema) }} />
    </main>
  );
}
