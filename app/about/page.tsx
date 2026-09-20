import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AboutSectionNav } from '@/components/about-section-nav';
import { meta } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import styles from './about.module.css';

const pagePath = '/about';

export const metadata: Metadata = buildPageMetadata({
  title: 'عن دليل نقادة — مشروع خدمي تطوعي مجاني',
  description: 'تعرّف إلى دليل نقادة، المشروع المحلي الخدمي والتطوعي المجاني الذي ينظم الخدمات والقرى والذاكرة المحلية بمصادر واضحة ومشاركة مجتمعية.',
  path: pagePath,
  keywords: ['عن دليل نقادة', 'دليل نقادة', 'مشروع تطوعي', 'خدمات نقادة', 'قرى نقادة', 'موسوعة نقادة'],
});

const principles = [
  { number: '01', title: 'خدمة قبل كل شيء', text: 'نختصر الطريق بين أهل نقادة والخدمة أو المكان أو المعلومة التي يبحثون عنها، دون رسوم على التصفح أو إرسال التصحيح.' },
  { number: '02', title: 'المصدر قبل الادعاء', text: 'نربط المعلومة بمصدرها كلما توفر، ونوضح حدودها بدل تحويل الرواية أو القرينة إلى حقيقة مطلقة.' },
  { number: '03', title: 'المكان له ذاكرة', text: 'لا يقتصر الدليل على الأنشطة؛ بل ينظم القرى والنجوع والأعلام والتراث والحكايات التي تصنع هوية نقادة.' },
  { number: '04', title: 'يبنيه أهله', text: 'كل إضافة موثقة أو تصحيح واضح يرفع جودة الدليل، لذلك المشاركة المجتمعية جزء من طريقة العمل وليست ملحقًا.' },
];

const workflow = [
  { number: '01', title: 'نجمع', text: 'بيانات عامة ومصادر محلية ومراجع قابلة للمراجعة.' },
  { number: '02', title: 'نراجع', text: 'الاسم والمكان والتصنيف وحدود المعلومة قبل النشر.' },
  { number: '03', title: 'ننظّم', text: 'نحوّل البيانات إلى صفحات واضحة وروابط بحث ووصول عملية.' },
  { number: '04', title: 'نحدّث', text: 'نستقبل التصحيحات ونراجع التغييرات حتى يبقى المحتوى حيًا.' },
];

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': `${siteConfig.url}${pagePath}#page`,
      url: `${siteConfig.url}${pagePath}`,
      name: 'عن دليل نقادة',
      description: 'دليل محلي خدمي تطوعي مجاني لمركز نقادة وقراه ونجوعه.',
      mainEntity: { '@id': `${siteConfig.url}/#website` },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      url: `${siteConfig.url}/`,
      name: 'دليل نقادة',
      inLanguage: 'ar',
      isAccessibleForFree: true,
      areaServed: 'مركز نقادة، محافظة قنا، مصر',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${siteConfig.url}/` },
        { '@type': 'ListItem', position: 2, name: 'عن الدليل', item: `${siteConfig.url}${pagePath}` },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <main id="main-content" className={`page-main ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={`shell ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <nav className={styles.breadcrumbs} aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span>/</span><b>عن الدليل</b></nav>
            <p className={styles.eyebrow}><i aria-hidden="true" /> من نقادة… ولأهل نقادة</p>
            <h1 id="about-title">معرفة المكان<br /><strong>في خدمة أهله.</strong></h1>
            <p className={styles.lead}>دليل نقادة مشروع محلي <em>خدمي وتطوعي ومجاني</em>، يجمع الخدمات والقرى والذاكرة المحلية في مساحة عربية واحدة؛ واضحة، سريعة، وقابلة للمراجعة والتحديث.</p>
            <div className={styles.promiseRow} aria-label="مبادئ الدليل"><span>مجاني للجميع</span><span>مشاركة مجتمعية</span><span>مصادر واضحة</span></div>
            <div className={styles.heroActions}>
              <Link href="/directory" className={styles.primaryAction}>استكشف الدليل <span aria-hidden="true">←</span></Link>
              <Link href="/contribute" className={styles.secondaryAction}>شارك بمعلومة <span aria-hidden="true">＋</span></Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.visualFrame}>
              <Image src="/images/landmarks/naqada-city.webp" alt="مشهد من مدينة نقادة بمحافظة قنا" fill priority sizes="(max-width: 820px) 92vw, 42vw" />
              <div className={styles.visualShade} aria-hidden="true" />
              <div className={styles.visualCaption}><small>مركز نقادة · محافظة قنا</small><b>الدليل يبدأ من المكان الحقيقي</b></div>
            </div>
            <div className={styles.freeBadge}><span>100%</span><b>مجاني<br />وتطوعي</b></div>
            <div className={styles.localBadge}><i aria-hidden="true" /><span><small>نطاق واضح</small><b>نقادة وقراها ونجوعها</b></span></div>
          </div>
        </div>
      </section>

      <div className={`shell ${styles.navWrap}`}><AboutSectionNav current="directory" /></div>

      <section className={`shell ${styles.metrics}`} aria-label="الدليل في أرقام">
        <article><b>{meta.businessCount.toLocaleString('ar-EG')}</b><span>خدمة ونشاط</span><small>بيانات منشورة قابلة للتحديث</small></article>
        <article><b>{meta.localityCount.toLocaleString('ar-EG')}</b><span>قرية وموضعًا</span><small>داخل نطاق مركز نقادة</small></article>
        <article><b>{meta.familyCount.toLocaleString('ar-EG')}</b><span>سجلًا عائليًا</span><small>بحدود توثيق واضحة</small></article>
        <article><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString('ar-EG')}</b><span>علمًا ومعلمًا</span><small>من ذاكرة المكان</small></article>
      </section>

      <section className={`shell ${styles.storySection}`}>
        <div className={styles.sectionMark}><span>01</span><b>الحكاية</b></div>
        <div className={styles.storyCopy}>
          <p className={styles.kicker}>لماذا وُجد دليل نقادة؟</p>
          <h2>لأن المعلومة المحلية<br /><em>تستحق مكانًا يليق بها.</em></h2>
          <div className={styles.storyColumns}>
            <p>بدأت الفكرة من احتياج بسيط يتكرر كل يوم: شخص يبحث عن طبيب أو مدرسة أو محل، وآخر يريد الوصول إلى قرية أو فهم حكاية مكان، بينما المعلومات موزعة بين الذاكرة والمنشورات والخرائط والمصادر القديمة.</p>
            <p>الدليل ينظم هذه الأجزاء دون أن يدّعي الكمال. ما نعرف مصدره نوضحه، وما يحتاج مراجعة لا نقدمه كحقيقة نهائية، وما يتغير نترك له باب التصحيح مفتوحًا.</p>
          </div>
        </div>
        <aside className={styles.volunteerCard}>
          <span className={styles.volunteerIcon} aria-hidden="true">✦</span>
          <p>التزام واضح</p>
          <h3>مشروع خدمي تطوعي مجاني.</h3>
          <ul><li>التصفح والوصول إلى المحتوى مجانيان.</li><li>إرسال إضافة أو تصحيح لا يتطلب رسومًا.</li><li>ظهور النشاط لا يعني اعتمادًا حكوميًا أو ضمانًا لجودته.</li><li>كل مساهمة تخضع للمراجعة قبل النشر.</li></ul>
        </aside>
      </section>

      <section className={styles.principlesSection}>
        <div className={`shell ${styles.principlesInner}`}>
          <header className={styles.sectionHeader}><div><p className={styles.kicker}>ما الذي يحكم قراراتنا؟</p><h2>أربع مبادئ.<br /><em>مسؤولية واحدة.</em></h2></div><p>أن يكون الدليل مفيدًا للناس، أمينًا مع المعلومة، واضحًا في حدوده، وسهل التطوير مع كل مساهمة جديدة.</p></header>
          <div className={styles.principlesGrid}>{principles.map((item, index) => <article key={item.number} style={{ '--i': index } as CSSProperties}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </div>
      </section>

      <section className={`shell ${styles.workflowSection}`}>
        <div className={styles.workflowIntro}><p className={styles.kicker}>من المعلومة إلى الصفحة</p><h2>كيف يعمل<br /><em>الدليل؟</em></h2><p>دورة بسيطة تحفظ قيمة المشاركة وتمنع أن تتحول السرعة إلى فوضى.</p></div>
        <ol className={styles.workflowList}>{workflow.map((step) => <li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
      </section>

      <section className={styles.closing}>
        <div className={`shell ${styles.closingInner}`}>
          <div><p>الدليل يكبر بالمعلومة الصحيحة</p><h2>تعرف نشاطًا ناقصًا<br />أو معلومة تحتاج تصحيحًا؟</h2></div>
          <div className={styles.closingActions}><Link href="/contribute">أرسل المعلومة <span aria-hidden="true">←</span></Link><Link href="/about/developer">تعرّف إلى المطوّر</Link></div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(schema) }} />
    </main>
  );
}
