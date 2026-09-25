import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { localities } from '@/lib/data';
import { getJobs } from '@/lib/jobs';
import { LUXOR_PLACES } from '@/supabase/functions/naqada-jobs/places';
import { absoluteUrl, jsonLdStringify, siteConfig } from '@/lib/site';
import { JobsBoard } from './jobs-board';
import styles from './jobs.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'وظائف نقادة وقنا والأقصر وقراها | فرص عمل وباحثون عن وظيفة',
  description: 'فرص عمل في نقادة وقراها، ومحافظتي قنا والأقصر بمراكزها وقراها مع مكان الوظيفة ورابط التقديم. أضف وظيفة أو اعرض خبراتك للبحث عن شغل.',
  alternates: { canonical: '/jobs' },
  openGraph: { title: 'وظائف نقادة وقنا والأقصر | دليل نقادة', description: 'اعرض وظيفة أو دوّر على شغل في نقادة وقنا والأقصر وقراها.', url: absoluteUrl('/jobs'), locale: siteConfig.locale, type: 'website' },
};

export default async function JobsPage() {
  const { jobs, state, available } = await getJobs();
  const offers = jobs.filter((job) => job.kind === 'offer');
  const seekers = jobs.filter((job) => job.kind === 'seeker');
  const localitiesList = [...new Set(['مركز نقادة', 'مدينة نقادة', ...localities.map((locality) => locality.name)])].sort((a, b) => a.localeCompare(b, 'ar'));
  const localOffers = offers.filter((job) => job.governorate === 'قنا' && localitiesList.includes(job.locality));
  const regionalOffers = offers.filter((job) => job.governorate === 'قنا' && !localitiesList.includes(job.locality));
  const luxorOffers = offers.filter((job) => job.governorate === 'الأقصر');
  const luxorLocalities = [...LUXOR_PLACES].sort((a, b) => a.localeCompare(b, 'ar'));
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'وظائف نقادة وقنا والأقصر وقراها', url: absoluteUrl('/jobs'),
    description: 'فرص عمل في مركز نقادة وقراه، وفرص أخرى في محافظتي قنا والأقصر بمراكزهما وقراهما مع توضيح مكان العمل.', inLanguage: 'ar-EG',
    mainEntity: { '@type': 'ItemList', itemListElement: offers.map((job, index) => ({ '@type': 'ListItem', position: index + 1, name: job.title, url: `${absoluteUrl('/jobs')}#job-${job.id}` })) },
  };
  return <main id="main-content" className={styles.page}>
    <section className={styles.hero}>
      <div className={`shell ${styles.heroShell}`}>
        <nav className={styles.breadcrumbs} aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><span>وظائف نقادة</span></nav>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><i aria-hidden="true" /> باب رزق من قلب البلد</span>
            <h1>شغلك الجاي <em>يمكن يكون هنا.</em></h1>
            <p>شوف فرص نقادة وقراها، ووسّع الدايرة لفرص قنا والأقصر ومراكزها وقراها. كل إعلان خارجي معاه مكانه ورابطه الأصلي، وعندك شغل للناس؟ انشر التفاصيل هنا.</p>
            <div className={styles.heroActions}><a href="#opportunities" className={styles.primary}>دوّر على فرصة <span aria-hidden="true">↙</span></a><a href="#participate" className={styles.secondary}>اعرض وظيفة أو خبرتك <span aria-hidden="true">←</span></a></div>
          </div>
          <div className={styles.heroVisual} aria-hidden="true"><span className={styles.orbitOne} /><span className={styles.orbitTwo} /><Image src="/images/jobs/job-seekers-duo.webp" width={840} height={840} alt="" className={styles.heroArtwork} sizes="(max-width: 760px) 260px, (max-width: 950px) 305px, 415px" priority /><span className={styles.floatOne}>فرصة قريبة</span><span className={styles.floatTwo}>من أهل البلد</span><span className={styles.floatThree}>خطوتك الجاية</span></div>
        </div>
      </div>
    </section>
    <div className={`shell ${styles.ribbon}`} aria-label="كيف يعمل قسم الوظائف"><span><b>01</b> شوف الوظائف القريبة</span><i aria-hidden="true" /><span><b>02</b> افتح الإعلان الأصلي أو تواصل</span><i aria-hidden="true" /><span><b>03</b> اعرض فرصتك أو خبرتك</span></div>
    <JobsBoard jobs={jobs} offers={localOffers.length} regionalOffers={regionalOffers.length} luxorOffers={luxorOffers.length} seekers={seekers.length} state={state} available={available} localities={localitiesList} luxorLocalities={luxorLocalities} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
  </main>;
}
