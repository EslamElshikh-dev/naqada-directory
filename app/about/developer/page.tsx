import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AboutSectionNav } from '@/components/about-section-nav';
import { DeveloperWorkShowcase } from '@/components/developer-work-showcase';
import { developerProjects } from '@/lib/developer-profile';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import styles from '@/app/knowledge/developer/developer.module.css';

const pagePath = '/about/developer';
const portraitPath = '/images/eslam-elshikh.jpg';

export const metadata: Metadata = buildPageMetadata({
  title: 'المهندس إسلام الشيخ — مطوّر دليل نقادة',
  description: 'تعرّف إلى المهندس إسلام الشيخ، مطوّر دليل نقادة، وإلى منهجه في هندسة الويب والأمن السيبراني والذكاء الاصطناعي والظهور المحلي.',
  path: pagePath,
  keywords: ['إسلام الشيخ', 'مطور دليل نقادة', 'مهندس برمجيات', 'أمن سيبراني', 'تطوير مواقع', 'نقادة'],
  socialImage: {
    url: `${siteConfig.url}${portraitPath}`,
    alt: 'المهندس إسلام الشيخ — مطوّر دليل نقادة',
  },
});

const metrics = [
  { value: '٤٧٢', label: 'ملفًا تجاريًا', note: 'دعم في التحقق والإدارة' },
  { value: '٢٣٣', label: 'مشكلة ظهور', note: 'تم تحليلها ومعالجتها' },
  { value: '٧٣', label: 'مشروع ويب', note: 'من الفكرة إلى الإطلاق' },
  { value: '٣٦٠°', label: 'رؤية متكاملة', note: 'أمان · تجربة · نمو' },
];

const expertise = [
  {
    number: '01', eyebrow: 'SECURE', title: 'الأمن من أول قرار',
    text: 'بناء التجربة على أساس واعٍ بالمخاطر والصلاحيات وحماية البيانات؛ لأن الأمان ليس إضافة متأخرة.',
    tags: ['Cybersecurity', 'Access Control', 'Risk Review'],
  },
  {
    number: '02', eyebrow: 'BUILD', title: 'هندسة ويب قابلة للتوسع',
    text: 'واجهات سريعة ومتجاوبة، ونظام مكوّنات واضح يحافظ على جودة المنتج كلما كبر المحتوى.',
    tags: ['Next.js', 'React', 'Responsive UI'],
  },
  {
    number: '03', eyebrow: 'THINK', title: 'ذكاء اصطناعي يخدم العمل',
    text: 'تحويل المعرفة والعمليات المتكررة إلى أدوات ذكية مفيدة، بواجهة إنسانية ونتائج قابلة للمراجعة.',
    tags: ['AI Agents', 'Automation', 'Knowledge Systems'],
  },
  {
    number: '04', eyebrow: 'GROW', title: 'ظهور محلي قابل للقياس',
    text: 'تهيئة تقنية ومحتوى محلي منظم يقرّبان الخدمة من الباحث عنها في الوقت والمكان الصحيحين.',
    tags: ['Technical SEO', 'Local SEO', 'Google Maps'],
  },
];

const process = [
  { number: '01', title: 'أفهم المكان', text: 'أبدأ بالناس والسياق والمشكلة الحقيقية، لا بالقالب.' },
  { number: '02', title: 'أنظّم المعرفة', text: 'أحوّل التفاصيل المبعثرة إلى بنية واضحة يمكن البحث فيها وتطويرها.' },
  { number: '03', title: 'أبني التجربة', text: 'أصمم وأطوّر الواجهة كوحدة واحدة: سريعة، عربية، ومتجاوبة.' },
  { number: '04', title: 'أطلق ثم أطوّر', text: 'المنتج الحي يتعلم من الاستخدام؛ لذلك القياس والتحسين جزء من البناء.' },
];

const stack = ['Next.js', 'React', 'TypeScript', 'Python', 'Vercel', 'GitHub', 'Supabase', 'Google Cloud', 'Structured Data', 'Technical SEO', 'AI Agents', 'Cybersecurity'];

const socialProfiles = [
  {
    name: 'GitHub', handle: 'EslamElshikh-dev', note: 'الكود والمشروعات المفتوحة', href: 'https://github.com/EslamElshikh-dev', className: styles.socialGithub,
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.2.8-.6v-2.1c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1 .8 2.1v3.2c0 .4.2.7.8.6A11.1 11.1 0 0 0 12 .9Z" /></svg>,
  },
  {
    name: 'X', handle: '@remoesoo10', note: 'تحديثات وآراء سريعة', href: 'https://x.com/remoesoo10', className: styles.socialX,
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 15.6 6.4 22H3.2l7.3-8.4L2.8 2h6.5l4.4 5.8L18.9 2Zm-1.1 17.8h1.7L8.4 4.1H6.6l11.2 15.7Z" /></svg>,
  },
  {
    name: 'Instagram', handle: '@remoesoo10', note: 'لقطات من الأعمال والتجارب', href: 'https://www.instagram.com/remoesoo10', className: styles.socialInstagram,
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.1 1.5a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>,
  },
  {
    name: 'Threads', handle: '@remoesoo10', note: 'أفكار ونقاشات تقنية', href: 'https://www.threads.net/@remoesoo10', className: styles.socialThreads,
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.1 10.8c-.1-3-1.7-4.8-4.8-5.1-2.2-.2-4 .6-5.2 2.2l1.8 1.3c.8-1 1.8-1.5 3.3-1.4 1.7.1 2.5.9 2.7 2.2-.8-.2-1.7-.3-2.6-.2-3 .2-4.9 1.8-4.8 4.2.1 2.3 2 3.8 4.6 3.7 2.3-.1 4-1.2 4.7-3.1.4.6.5 1.4.5 2.1 0 3-1.9 5-5.1 5-4.3 0-7.1-3.2-7.1-8.9S7.8 3.8 12 3.8c3.2 0 5.3 1.6 6.6 4l2-1.1C19 3.4 16 1.5 12 1.5 6.4 1.5 2.8 5.9 2.8 12.7S6.5 24 12.2 24c4.6 0 7.5-3 7.5-7.3 0-2.5-.8-4.5-2.6-5.9Zm-5 4.7c-1.3 0-2.2-.6-2.2-1.6 0-1.1.9-1.7 2.5-1.8 1 0 1.9.1 2.7.4-.2 1.8-1.2 2.9-3 3Z" /></svg>,
  },
  {
    name: 'YouTube', handle: '@remoesoo10', note: 'فيديوهات وشروحات عملية', href: 'https://www.youtube.com/@remoesoo10', className: styles.socialYoutube,
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" /></svg>,
  },
  {
    name: 'TikTok', handle: '@remoesoo', note: 'محتوى تقني مختصر', href: 'https://www.tiktok.com/@remoesoo', className: styles.socialTiktok,
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.6 2c.3 2.4 1.7 3.9 4.1 4.1v3.2a8.3 8.3 0 0 1-4-1.2v7.3a6.6 6.6 0 1 1-5.7-6.5v3.3a3.3 3.3 0 1 0 2.4 3.2V2h3.2Z" /></svg>,
  },
];

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${siteConfig.url}${pagePath}#profile`,
      url: `${siteConfig.url}${pagePath}`,
      name: 'المهندس إسلام الشيخ — مطوّر دليل نقادة',
      mainEntity: { '@id': `${siteConfig.url}${pagePath}#eslam-elshikh` },
    },
    {
      '@type': 'Person',
      '@id': `${siteConfig.url}${pagePath}#eslam-elshikh`,
      name: 'إسلام الشيخ',
      alternateName: ['Eslam Elshikh', 'Eslam El-Sheikh'],
      image: `${siteConfig.url}${portraitPath}`,
      url: 'https://www.eslam-elshikh.com/',
      jobTitle: ['مهندس أمن سيبراني', 'مطور برمجيات', 'متخصص خرائط Google'],
      knowsAbout: ['Cybersecurity', 'Web Development', 'Artificial Intelligence', 'Technical SEO', 'Local SEO'],
      sameAs: [
        'https://www.eslam-elshikh.com/',
        'https://github.com/EslamElshikh-dev',
        'https://x.com/remoesoo10',
        'https://www.instagram.com/remoesoo10',
        'https://www.threads.net/@remoesoo10',
        'https://www.youtube.com/@remoesoo10',
        'https://www.tiktok.com/@remoesoo',
        'https://me.developers.google.com/u/EslamElshikh',
        'https://www.wikidata.org/wiki/Q138800449',
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${siteConfig.url}/` },
        { '@type': 'ListItem', position: 2, name: 'عن الدليل', item: `${siteConfig.url}/about` },
        { '@type': 'ListItem', position: 3, name: 'عن المطوّر', item: `${siteConfig.url}${pagePath}` },
      ],
    },
    {
      '@type': 'ItemList',
      '@id': `${siteConfig.url}${pagePath}#selected-work`,
      name: 'أعمال مختارة للمهندس إسلام الشيخ',
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
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={`shell ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <nav className={styles.breadcrumbs} aria-label="مسار الصفحة">
              <Link href="/">الرئيسية</Link><span>/</span><Link href="/about">عن الدليل</Link><span>/</span><b>عن المطوّر</b>
            </nav>
            <p className={styles.eyebrow}><i aria-hidden="true" /> المطوّر خلف التجربة</p>
            <h1 id="developer-title">المهندس<br /><strong>إسلام الشيخ</strong></h1>
            <p className={styles.lead}>مهندس أمن سيبراني ومطوّر برمجيات يبني منتجات رقمية عربية تجمع <em>القوة التقنية</em> مع وضوح التجربة وأثرٍ حقيقي على الأرض.</p>
            <p className={styles.statement}>يبني ما يبقى… <span>لا ما يلمع فقط.</span></p>
            <div className={styles.heroActions}>
              <a href="#selected-work" className={styles.primaryAction}>شاهد الأعمال المختارة <span aria-hidden="true">←</span></a>
              <a href="https://www.eslam-elshikh.com/" target="_blank" rel="noreferrer" className={styles.secondaryAction}>الموقع الشخصي <span aria-hidden="true">↗</span></a>
            </div>
          </div>

          <div className={styles.portraitStage}>
            <div className={styles.orbit} aria-hidden="true"><span /><span /><span /></div>
            <div className={styles.portraitFrame}>
              <Image src={portraitPath} alt="صورة المهندس إسلام الشيخ" fill priority sizes="(max-width: 760px) 88vw, 42vw" />
              <div className={styles.portraitShade} aria-hidden="true" />
            </div>
            <div className={styles.statusBadge}><i aria-hidden="true" /><span><small>متاح رقميًا</small><b>Riyadh · Online</b></span></div>
            <div className={styles.identityBadge}><small>ENGINEER / CREATOR</small><b>ESLAM<br />ELSHIKH</b></div>
            <span className={styles.codeBadge} aria-hidden="true">{'{ 360° }'}</span>
          </div>
        </div>
      </section>

      <div className={`shell ${styles.navWrap}`}><AboutSectionNav current="developer" /></div>

      <section className={`shell ${styles.metrics}`} aria-label="أرقام من الخبرة">
        {metrics.map((metric, index) => <article key={metric.label} style={{ '--i': index } as CSSProperties}>
          <b>{metric.value}</b><span>{metric.label}</span><small>{metric.note}</small>
        </article>)}
      </section>

      <section className={`shell ${styles.manifesto}`}>
        <div className={styles.sectionLabel}><span>01</span><b>الفكرة</b></div>
        <div className={styles.manifestoCopy}>
          <p className={styles.kicker}>منتج محلي بمعايير عالمية</p>
          <h2>التقنية الجيدة لا تُرى وحدها؛<br /><em>أثرها هو الذي يُرى.</em></h2>
          <p>بدأ دليل نقادة من سؤال بسيط: كيف يجد ابن المكان ما يحتاجه بسهولة، وكيف نحفظ معرفة المدينة وقراها في صورة منظمة وموثوقة؟ من هنا صُمّمت المنصة كذاكرة رقمية حيّة، وليست مجرد قائمة روابط.</p>
          <blockquote><span aria-hidden="true">“</span>أتعامل مع كل شاشة كقرار، وكل معلومة كمسؤولية، وكل ثانية انتظار كفرصة للتحسين.</blockquote>
        </div>
      </section>

      <section className={`shell ${styles.expertiseSection}`}>
        <header className={styles.sectionHeader}>
          <div><p className={styles.kicker}>مجالات التأثير</p><h2>أربع زوايا.<br /><em>رؤية واحدة.</em></h2></div>
          <p>مزيج بين التفكير الأمني، الهندسة الدقيقة، الذكاء الاصطناعي، وفهم كيف يصل المنتج إلى جمهوره.</p>
        </header>
        <div className={styles.expertiseGrid}>
          {expertise.map((item, index) => <article key={item.number} style={{ '--i': index } as CSSProperties}>
            <div className={styles.expertiseTop}><span>{item.number}</span><small>{item.eyebrow}</small></div>
            <h3>{item.title}</h3><p>{item.text}</p>
            <div className={styles.tags}>{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>)}
        </div>
      </section>

      <DeveloperWorkShowcase />

      <section className={`shell ${styles.processSection}`}>
        <div className={styles.processIntro}>
          <p className={styles.kicker}>منهج العمل</p><h2>من الفكرة<br />إلى <em>منتج حي.</em></h2>
          <p>عملية واضحة، لكن غير جامدة. كل مرحلة تختبر الفرضية التي قبلها وتغذي التي بعدها.</p>
        </div>
        <ol className={styles.processList}>
          {process.map((step) => <li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><i aria-hidden="true">←</i></li>)}
        </ol>
      </section>

      <section className={styles.stackSection}>
        <div className={`shell ${styles.stackGrid}`}>
          <div><p className={styles.kicker}>الأدوات تتغير، المعيار لا</p><h2>تقنيات حديثة.<br /><em>اختيارات محسوبة.</em></h2><p>أختار الأداة التي تخدم المنتج وتُبقيه سريعًا، آمنًا، وسهل التطوير.</p></div>
          <div className={styles.stackCloud} aria-label="تقنيات وخبرات">
            {stack.map((item, index) => <span key={item} style={{ '--i': index } as CSSProperties}>{item}</span>)}
          </div>
        </div>
      </section>

      <section className={`shell ${styles.networkSection}`} aria-labelledby="social-title">
        <header className={styles.networkHeader}>
          <div><p className={styles.kicker}>تواصل ومتابعة</p><h2 id="social-title">على المنصات.<br /><em>بنفس الهوية.</em></h2></div>
          <p>الحسابات الرسمية للمهندس إسلام الشيخ لمتابعة الأعمال والتحديثات والمحتوى التقني.</p>
        </header>
        <div className={styles.socialGrid}>
          {socialProfiles.map((profile, index) => <a
            key={profile.name}
            href={profile.href}
            target="_blank"
            rel="noreferrer me"
            className={`${styles.socialCard} ${profile.className}`}
            style={{ '--i': index } as CSSProperties}
            aria-label={`متابعة إسلام الشيخ على ${profile.name}`}
          >
            <span className={styles.socialIcon}>{profile.icon}</span>
            <span className={styles.socialCopy}><b>{profile.name}</b><small>{profile.handle}</small><em>{profile.note}</em></span>
            <i aria-hidden="true">↗</i>
          </a>)}
        </div>
      </section>

      <section className={`shell ${styles.identitySection}`}>
        <div className={styles.monogram} aria-hidden="true"><span>ES</span><i /></div>
        <div className={styles.identityCopy}>
          <p className={styles.kicker}>هوية موثّقة</p><h2>إسلام الشيخ <small>/ ESLAM ELSHIKH</small></h2>
          <p>مهندس أمن سيبراني ومطوّر برمجيات ومتخصص في الحضور المحلي وخرائط Google. يعمل عند نقطة التقاء التقنية، التصميم، والأثر التجاري.</p>
          <div className={styles.identityLinks}>
            <a href="https://www.eslam-elshikh.com/" target="_blank" rel="noreferrer">الموقع الرسمي ↗</a>
            <a href="https://github.com/EslamElshikh-dev" target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href="https://me.developers.google.com/u/EslamElshikh" target="_blank" rel="noreferrer">Google Developer ↗</a>
            <a href="https://www.wikidata.org/wiki/Q138800449" target="_blank" rel="noreferrer">Wikidata · Q138800449 ↗</a>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <div className={`shell ${styles.closingInner}`}>
          <span className={styles.closingMark} aria-hidden="true">إس</span>
          <div><p>خلف كل تجربة قوية… قرار محسوب.</p><h2>هل لديك فكرة<br /><em>تستحق أن تُبنى؟</em></h2></div>
          <div className={styles.closingActions}><a href="https://www.eslam-elshikh.com/" target="_blank" rel="noreferrer">ابدأ تواصلًا <span>↗</span></a><Link href="/about">عن دليل نقادة</Link></div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(schema) }} />
    </main>
  );
}
