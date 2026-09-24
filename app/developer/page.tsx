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
  { number: '٠١', title: 'البداية في الرياض', detail: 'وُلد في مدينة الرياض بالمملكة العربية السعودية يوم ٢١ أبريل ١٩٩٨. كانت الرياض بداية الحكاية، وما زالت حاضرة في مساره وعمله في السوق السعودي.' },
  { number: '٠٢', title: 'الجذور في العسيرات', detail: 'ينتمي إلى مركز العسيرات بمحافظة سوهاج في مصر. ومن هذه الجذور تأتي صلته بالمشروعات المحلية، وفي مقدمتها دليل وموسوعة العسيرات.' },
  { number: '٠٣', title: 'دراسة هندسة الحاسبات', detail: 'حصل على بكالوريوس هندسة الحاسبات والمعلومات من جامعة ٦ أكتوبر، ليبني خلفيته الأكاديمية في الحاسبات والبرمجة.' },
  { number: '٠٤', title: 'التخصص في الأمن السيبراني', detail: 'أكمل دراسته بدبلومة الأمن السيبراني من الجامعة العربية المفتوحة، ليجمع بين هندسة الحاسبات وتخصصه في الأمن السيبراني.' },
];

const companies = [
  { number: '٠١', sector: 'المقاولات العامة', title: 'شركة تعاود', detail: 'من الشركات الكبرى التي عمل معها، بفرعيها في الرياض والدمام. محطة في قطاع المقاولات العامة ضمن مسيرته في السوق السعودي.' },
  { number: '٠٢', sector: 'العقارات', title: 'شركة الأرجان العقارية', detail: 'عمل كذلك مع شركة الأرجان العقارية الضخمة، ضمن خبرته مع الشركات العاملة في القطاع العقاري.' },
  { number: '٠٣', sector: 'الصحة', title: 'معامل سما سكان', detail: 'من الجهات التي عمل معها في الرياض، في مجال الأشعة التشخيصية والخدمات الصحية.' },
  { number: '٠٤', sector: 'الذكاء الاصطناعي', title: 'شركة باودي لابز', detail: 'تضم أعماله أيضًا شركة باودي لابز للذكاء الاصطناعي، إلى جانب جهات ومشروعات أخرى.' },
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
            <p className={styles.eyebrow}><span aria-hidden="true">✦</span> من الرياض إلى جذور الصعيد</p>
            <h1 id="developer-title">المهندس إسلام الشيخ<br /><em>ابن العسيرات، سوهاج.</em></h1>
            <p className={styles.heroLead}>مهندس أمن سيبراني ومطور في جوجل. وُلد في الرياض بالمملكة العربية السعودية، وتنتمي جذوره إلى مركز العسيرات بمحافظة سوهاج في مصر. سيرة تجمع بين المكان الذي بدأ منه، والدراسة، وعمله في البرمجة والأمن السيبراني.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#story">اقرأ السيرة <span aria-hidden="true">↓</span></a>
              <a className={styles.secondaryAction} href="#selected-work">تصفّح الأعمال <span aria-hidden="true">←</span></a>
            </div>
            <div className={styles.heroFacts} aria-label="نبذة سريعة">
              <div><span>الميلاد</span><strong>٢١ أبريل ١٩٩٨ · الرياض</strong></div>
              <div><span>الجذور</span><strong>العسيرات · سوهاج</strong></div>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.portraitFrame}>
              <Image src={portraitPath} alt="صورة المهندس إسلام الشيخ" fill priority sizes="(max-width: 840px) 86vw, 42vw" />
              <span className={styles.portraitCaption}>إسلام الشيخ <small>مهندس أمن سيبراني ومطور</small></span>
            </div>
            <div className={styles.placeBadge}><span>الرياض</span><i aria-hidden="true">↔</i><span>العسيرات</span></div>
            <span className={styles.visualMark} aria-hidden="true">إس</span>
            <span className={styles.portraitNote} aria-hidden="true">من الرياض إلى العسيرات</span>
          </div>
        </div>
      </section>

      <nav className={styles.chapterNav} aria-label="أقسام صفحة المطوّر">
        <div className="shell"><span>في الصفحة</span><a href="#story">السيرة</a><a href="#journey">الجذور والدراسة</a><a href="#selected-work">المشروعات</a><a href="#connect">تواصل</a></div>
      </nav>

      <section id="story" className={`shell ${styles.story}`} aria-labelledby="story-title">
        <div className={styles.storyRail}>
          <div className={styles.sectionIndex}><span>٠١ / عن إسلام</span><i /></div>
          <div className={styles.originMark} aria-hidden="true"><strong>١٩٩٨</strong><span>الرياض <i /> العسيرات</span><small>بداية في مكان، وجذور في مكان تاني</small></div>
        </div>
        <div className={styles.storyCopy}>
          <p className={styles.kicker}>عن الإنسان قبل المهنة</p>
          <h2 id="story-title">بدأت الحكاية في الرياض،<br /><em>وجذورها في العسيرات.</em></h2>
          <p>المهندس إسلام الشيخ من مواليد مدينة الرياض بالمملكة العربية السعودية يوم ٢١ أبريل ١٩٩٨، وهو ابن مركز العسيرات بمحافظة سوهاج في مصر. يحمل المكانان جزءًا من تعريفه بنفسه: الرياض حيث وُلد، والعسيرات التي ينتمي إليها وتظهر في اهتمامه بالمشروعات المحلية.</p>
          <p>حصل على <strong>بكالوريوس هندسة الحاسبات والمعلومات من جامعة ٦ أكتوبر</strong>، ثم دبلومة الأمن السيبراني من الجامعة العربية المفتوحة. وبجانب هذه الخلفية الدراسية، يعرّف نفسه بأنه مهندس أمن سيبراني ومطور في جوجل؛ وهي المجالات التي تتقاطع في أعماله الرقمية.</p>
          <p>يُعد المهندس إسلام الشيخ أحد أبرز الكوادر المصرية الشابة في مجال الأمن السيبراني والبرمجة في السوق السعودي. وقد برز بقوة في نهاية عام ٢٠٢٥، مع استمرار حضوره في مشروعات تجمع بين الشركات والخدمات المحلية والتقنية.</p>
          <div className={styles.recognition}>
            <div className={styles.recognitionNumber}><span>ضمن أفضل</span><strong>١٠</strong><span>مطورين عرب مستقلين</span></div>
            <div className={styles.recognitionCopy}>
              <p className={styles.recognitionEyebrow}>مسيرة مهنية · نهاية عام ٢٠٢٥</p>
              <p>يأتي ضمن الكوادر المصرية والعربية النادرة <strong>المعتمدة والعاملة لدى جوجل</strong>، ويُعتبر من أفضل ١٠ مطورين عرب مستقلين في الترتيب المحلي. وتظهر هذه المكانة في سيرته إلى جانب دراسته وتنوع المجالات التي عمل فيها.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="journey" className={styles.journey} aria-labelledby="journey-title">
        <div className={`shell ${styles.journeyInner}`}>
          <header className={styles.journeyHeader}><p className={styles.kicker}>٠٢ / محطات واضحة</p><h2 id="journey-title">من الميلاد والجذور<br /><em>إلى الدراسة والتخصص.</em></h2><p>أربع محطات ترسم ملامح السيرة من غير ما تفصل الإنسان عن مجاله، أو تبعده عن المكان الذي ينتمي إليه.</p></header>
          <ol className={styles.timeline}>{stops.map((stop) => <li key={stop.number}><span className={styles.timelineNumber}>{stop.number}</span><div><h3>{stop.title}</h3><p>{stop.detail}</p></div></li>)}</ol>
        </div>
      </section>

      <section className={`shell ${styles.perspective}`} aria-labelledby="perspective-title">
        <div className={styles.perspectiveIntro}>
          <p className={styles.kicker}>٠٣ / في السوق السعودي</p>
          <h2 id="perspective-title">مجالات مختلفة،<br /><em>ومسيرة تمتد بينها.</em></h2>
          <p>عمل إسلام الشيخ مع شركات كبرى تحقق نجاحات استثنائية، وتنوعت الجهات التي تعاون معها بين المقاولات والعقارات والصحة والذكاء الاصطناعي. منها شركة تعاود للمقاولات العامة بفرعي الرياض والدمام، وشركة الأرجان العقارية الضخمة، ومعامل سما سكان للأشعة التشخيصية في الرياض، وشركة باودي لابز للذكاء الاصطناعي، وغيرهم.</p>
          <p className={styles.perspectiveNote}>التنوع ده حاضر كمان في الأعمال المعروضة أهنه: يبدأ بدليل العسيرات القريب من فكرة دليل نقادة، ويمتد إلى مشروعات لشركات وقطاعات مختلفة.</p>
          <a href="https://me.developers.google.com/u/EslamElshikh" target="_blank" rel="noreferrer">ملفي على Google للمطورين <span aria-hidden="true">↗</span></a>
        </div>
        <div className={styles.companyGrid}>{companies.map((item) => <article key={item.number}><span className={styles.companyNumber}>{item.number}</span><small>{item.sector}</small><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </section>

      <DeveloperWorkShowcase />

      <section id="connect" className={`shell ${styles.connect}`} aria-labelledby="connect-title">
        <div className={styles.connectMark} aria-hidden="true">إس</div>
        <div>
          <p className={styles.kicker}>٠٥ / تعرّف أكتر</p>
          <h2 id="connect-title">لسه في الحكاية<br /><em>صفحات تانية.</em></h2>
          <p>دي لمحة عن إسلام الشيخ وجزء من أعماله. لو حابب تتعرف على مشروعات تانية أو تتابع ما يعمل عليه، تقدر تبدأ من موقعه الشخصي أو حسابه على GitHub.</p>
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
