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
  title: 'المهندس إسلام الشيخ | حكاية ابن العسيرات ومطوّر دليل نقادة',
  description: 'تعرّف إلى المهندس إسلام الشيخ: مولود الرياض، ابن العسيرات بسوهاج، ومطوّر دليل نقادة. حكاية شخصية وأعمال مختارة في الدلائل المحلية والويب والأمن السيبراني.',
  path: pagePath,
  keywords: ['إسلام الشيخ', 'المهندس إسلام الشيخ', 'مطور دليل نقادة', 'دليل العسيرات', 'العسيرات سوهاج', 'أمن سيبراني'],
  socialImage: { url: `${siteConfig.url}${portraitPath}`, alt: 'المهندس إسلام الشيخ، مطوّر دليل نقادة' },
});

const stops = [
  { number: '٠١', title: 'الرياض، أول الحكاية', detail: 'اتولدت في مدينة الرياض بالمملكة العربية السعودية يوم ٢١ أبريل ١٩٩٨. ومن هناك بدأت حكاية امتدت بين بلدين.' },
  { number: '٠٢', title: 'العسيرات، الجذور', detail: 'أنا ابن مركز العسيرات في محافظة سوهاج. الانتماء للمكان هو اللي خلّاني أقدّر قيمة المعلومة لما تكون قريبة من أهلها.' },
  { number: '٠٣', title: 'علم يتبني عليه', detail: 'درست هندسة الحاسبات والمعلومات في جامعة ٦ أكتوبر، ثم أكملت دبلومة في الأمن السيبراني بالجامعة العربية المفتوحة.' },
  { number: '٠٤', title: 'من الناس للمشروعات', detail: 'اشتغلت على مشروعات رقمية في السعودية ومصر، من الدلائل المحلية إلى مواقع الخدمات والصحة والتقنية، وكل مشروع له ناس ومشكلة حقيقية.' },
];

const approach = [
  { number: '١', title: 'أسمع الحكاية الأول', detail: 'قبل ما أكتب سطر كود، أفهم الناس بتدور على إيه وليه. الموقع النافع يبدأ بسؤال مظبوط.' },
  { number: '٢', title: 'أبني بثقة', detail: 'دراستي للأمن السيبراني داخلة في طريقة الشغل: خصوصية، وضوح، وتجربة سهلة تحترم وقت اللي بيستخدمها.' },
  { number: '٣', title: 'أرجع للمكان', detail: 'دليل العسيرات ودليل نقادة شاهدين على فكرة بحبها: بلدنا تستاهل أدوات رقمية معمولة على مقاس أهلها.' },
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
      jobTitle: ['مهندس أمن سيبراني', 'مطور برمجيات وويب'],
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
            <p className={styles.eyebrow}><span aria-hidden="true">✦</span> ورا الدليل حكاية</p>
            <h1 id="developer-title">أنا إسلام الشيخ.<br /><em>من العسيرات... والحكاية لسه مكملة.</em></h1>
            <p className={styles.heroLead}>اتولدت في الرياض، وجذوري في سوهاج. بين المكانين اتكوّنت نظرتي للشغل: التقنية قيمتها الحقيقية لما تقرّب الناس من اللي محتاجينه.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#story">اسمع الحكاية <span aria-hidden="true">↓</span></a>
              <a className={styles.secondaryAction} href="#selected-work">شوف المشروعات <span aria-hidden="true">←</span></a>
            </div>
            <p className={styles.heroAside}>مهندس أمن سيبراني ومطوّر ويب <span aria-hidden="true">·</span> ابن العسيرات، سوهاج</p>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.portraitFrame}>
              <Image src={portraitPath} alt="صورة المهندس إسلام الشيخ" fill priority sizes="(max-width: 840px) 86vw, 42vw" />
              <span className={styles.portraitCaption}>إسلام الشيخ <small>صاحب الحكاية</small></span>
            </div>
            <div className={styles.placeBadge}><span>الرياض</span><i aria-hidden="true">↔</i><span>العسيرات</span></div>
            <span className={styles.visualMark} aria-hidden="true">إس</span>
          </div>
        </div>
      </section>

      <nav className={styles.chapterNav} aria-label="أقسام صفحة المطوّر">
        <div className="shell"><span>فهرس الحكاية</span><a href="#story">البداية</a><a href="#journey">المحطات</a><a href="#selected-work">المشروعات</a><a href="#connect">تواصل</a></div>
      </nav>

      <section id="story" className={`shell ${styles.story}`} aria-labelledby="story-title">
        <div className={styles.sectionIndex}><span>٠١ / الحكاية</span><i /></div>
        <div className={styles.storyCopy}>
          <p className={styles.kicker}>بعيدًا عن المسميات الطويلة</p>
          <h2 id="story-title">أنا ابن مكانين،<br /><em>والأصل عمره ما بيغيب.</em></h2>
          <p>اسمي إسلام الشيخ. اتولدت في مدينة الرياض بالمملكة العربية السعودية يوم ٢١ أبريل ١٩٩٨، وأهلي وجذوري من مركز العسيرات في محافظة سوهاج. الرياض جزء من بدايتي، والعسيرات هي البلد اللي أحمل اسمها وارتباطي بيها.</p>
          <p>من بدري شدّتني فكرة إن المعلومة المفيدة لازم توصل للي محتاجها من غير لف ودوران. وده اللي خلّاني أميل لمشروعات تجمع الناس بمكانها: الطبيب القريب، الخدمة الصح، أو حكاية تستاهل تتقال. وأهو بدل ما نسأل عشرين واحد على الطريق، نخلّي له دليل.</p>
          <p>درست هندسة الحاسبات والمعلومات بجامعة ٦ أكتوبر، وبعدها دبلومة الأمن السيبراني بالجامعة العربية المفتوحة. الدراسة فتحت لي باب الأدوات؛ لكن السؤال اللي بيحركني في كل مشروع لسه هو نفسه: <strong>إيه اللي هينفع الناس فعلًا؟</strong></p>
        </div>
      </section>

      <section id="journey" className={styles.journey} aria-labelledby="journey-title">
        <div className={`shell ${styles.journeyInner}`}>
          <header className={styles.journeyHeader}><p className={styles.kicker}>٠٢ / محطات في الطريق</p><h2 id="journey-title">خطوات قليلة على الورق،<br /><em>وراها مشوار كامل.</em></h2></header>
          <ol className={styles.timeline}>{stops.map((stop) => <li key={stop.number}><span className={styles.timelineNumber}>{stop.number}</span><div><h3>{stop.title}</h3><p>{stop.detail}</p></div></li>)}</ol>
        </div>
      </section>

      <section className={`shell ${styles.perspective}`} aria-labelledby="perspective-title">
        <div className={styles.perspectiveIntro}>
          <p className={styles.kicker}>اللي يهمني في الشغل</p>
          <h2 id="perspective-title">المهنة جزء منّي،<br /><em>والناس هي الحكاية.</em></h2>
          <p>في السعودية اشتغلت على تجارب رقمية لشركة تعاود للمقاولات، ومركز سما سكان للأشعة في الرياض، وBowdy Labs للذكاء الاصطناعي، وقدّمت تصورًا لمنصة CRM لشركة مشاريع الأرجان. كل تجربة زوّدتني فهمًا مختلفًا للناس اللي هتستخدمها.</p>
          <a href="https://me.developers.google.com/u/EslamElshikh" target="_blank" rel="noreferrer">ملفي في برنامج Google للمطورين <span aria-hidden="true">↗</span></a>
        </div>
        <div className={styles.approachGrid}>{approach.map((item) => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </section>

      <DeveloperWorkShowcase />

      <section id="connect" className={`shell ${styles.connect}`} aria-labelledby="connect-title">
        <div className={styles.connectMark} aria-hidden="true">إس</div>
        <div>
          <p className={styles.kicker}>لسه في الحكاية مكان لفصل جديد</p>
          <h2 id="connect-title">عندك فكرة تنفع الناس؟<br /><em>تعال نحكي فيها.</em></h2>
          <p>سواء فكرتك للبلد أو لشغلك، أحب أبدأ بالاستماع، وبعدها نشوف الطريق الأنسب ليها.</p>
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
