import type { Metadata } from 'next';
import Link from 'next/link';
import { localities } from '@/lib/data';
import { getJobs } from '@/lib/jobs';
import { absoluteUrl, jsonLdStringify, siteConfig } from '@/lib/site';
import { JobsBoard } from './jobs-board';
import styles from './jobs.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'وظائف نقادة وقراها | فرص عمل وباحثون عن وظيفة',
  description: 'فرص عمل في نقادة وقراها ونجوعها، مع المصدر وطريقة التواصل. أضف وظيفة أو اعرض خبراتك للبحث عن شغل قريب منك.',
  alternates: { canonical: '/jobs' },
  openGraph: { title: 'وظائف نقادة وقراها | دليل نقادة', description: 'اعرض وظيفة أو دوّر على شغل بين أهلك في نقادة وقراها.', url: absoluteUrl('/jobs'), locale: siteConfig.locale, type: 'website' },
};

export default async function JobsPage() {
  const { jobs, state, available } = await getJobs();
  const offers = jobs.filter((job) => job.kind === 'offer');
  const seekers = jobs.filter((job) => job.kind === 'seeker');
  const localitiesList = [...new Set(['مركز نقادة', 'مدينة نقادة', ...localities.map((locality) => locality.name)])].sort((a, b) => a.localeCompare(b, 'ar'));
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'وظائف نقادة وقراها', url: absoluteUrl('/jobs'),
    description: 'فرص عمل وباحثون عن وظيفة في مركز نقادة وقراه ونجوعه.', inLanguage: 'ar-EG',
    mainEntity: { '@type': 'ItemList', itemListElement: offers.map((job, index) => ({ '@type': 'ListItem', position: index + 1, name: job.title, url: `${absoluteUrl('/jobs')}#job-${job.id}` })) },
  };
  return <main id="main-content" className={styles.page}>
    <section className={styles.hero}>
      <div className={`shell ${styles.heroShell}`}>
        <nav className={styles.breadcrumbs} aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><span>وظائف نقادة</span></nav>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><i aria-hidden="true" /> باب رزق من قلب البلد</span>
            <h1>شغلك الجاي <em>يمكن يكون أهنه.</em></h1>
            <p>لو بتدور على فرصة في نقادة أو قرية من قراها، تعالى شوف المعروض. ولو عندك شغل للناس، انشر التفاصيل وخلي الطريق بينكم أقصر.</p>
            <div className={styles.heroActions}><a href="#opportunities" className={styles.primary}>دوّر على فرصة <span aria-hidden="true">↙</span></a><a href="#participate" className={styles.secondary}>اعرض وظيفة أو خبرتك <span aria-hidden="true">←</span></a></div>
          </div>
          <div className={styles.heroVisual} aria-hidden="true"><span className={styles.orbitOne} /><span className={styles.orbitTwo} /><span className={styles.centerMark}>ن</span><span className={styles.floatOne}>فرصة قريبة</span><span className={styles.floatTwo}>من أهل البلد</span><span className={styles.floatThree}>خطوتك الجاية</span></div>
        </div>
      </div>
    </section>
    <div className={`shell ${styles.ribbon}`} aria-label="كيف يعمل قسم الوظائف"><span><b>01</b> شوف الوظائف القريبة</span><i aria-hidden="true" /><span><b>02</b> افتح الإعلان الأصلي أو تواصل</span><i aria-hidden="true" /><span><b>03</b> اعرض فرصتك أو خبرتك</span></div>
    <JobsBoard jobs={jobs} offers={offers.length} seekers={seekers.length} state={state} available={available} localities={localitiesList} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
  </main>;
}
