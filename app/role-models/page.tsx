import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { roleModels } from '@/lib/role-models';
import { absoluteUrl, jsonLdStringify, siteConfig } from '@/lib/site';
import styles from './role-models.module.css';

export const metadata: Metadata = {
  title: 'نماذج مشرفة في نقادة',
  description: 'قصص أبناء وبنات مركز نقادة ممن جمعوا بين التعلم والعمل والمشاركة المجتمعية. لكل شخص صفحة مستقلة ومصدر واضح.',
  alternates: { canonical: '/role-models' },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: absoluteUrl('/role-models'),
    title: 'نماذج مشرفة في نقادة',
    description: 'وجوه من نقادة تستحق أن نعرف حكايتها، بقصص مستقلة ومصادر معلنة.',
    siteName: siteConfig.shortName,
  },
};

export default function RoleModelsPage() {
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'نماذج مشرفة في نقادة',
    description: 'قصص محلية لأشخاص من مركز نقادة مع إسناد كل قصة إلى مصدرها.',
    url: absoluteUrl('/role-models'),
    inLanguage: 'ar-EG',
    isPartOf: { '@id': absoluteUrl('/') + '#website' },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: roleModels.map((person, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: person.name,
        url: absoluteUrl('/role-models/' + person.slug),
      })),
    },
  };

  return <main id="main-content" className={styles.page}>
    <section className={styles.hero}>
      <div className={'shell ' + styles.heroInner}>
        <nav className={styles.breadcrumbs} aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><span>نماذج مشرفة</span></nav>
        <span className={styles.eyebrow}>من أهل نقادة · حكايات تستحق النور</span>
        <h1>نماذج مشرفة <em>في نقادة</em></h1>
        <p>في بلدنا ناس بتتعب وتتعلم وتسيب أثر. هنا نقرّبك من حكاياتهم، باسم كل شخص ومصدر قصته، عشان تعرف صاحب الحكاية من أولها.</p>
        <a className={styles.heroLink} href="#stories">اتعرّف على الحكايات <span aria-hidden="true">↙</span></a>
      </div>
      <span className={styles.heroGlyph} aria-hidden="true">ن</span>
    </section>

    <section className={'shell ' + styles.collection} id="stories" aria-labelledby="stories-title">
      <div className={styles.sectionHeading}>
        <div><span>وجوه من البلد</span><h2 id="stories-title">لكل إنجاز حكاية واسم</h2></div>
        <small>القسم بيكبر بقصص أهل نقادة</small>
      </div>
      <div className={styles.cards}>
        {roleModels.map((person) => <article className={styles.card} key={person.slug}>
          <Link href={'/role-models/' + person.slug} className={styles.cardLink} aria-label={'اقرأ قصة ' + person.name}>
            <span className={styles.cardVisual}>
              {person.photos[0]
                ? <Image src={person.photos[0].src} alt={person.photos[0].alt} width={person.photos[0].width} height={person.photos[0].height} sizes="(max-width: 720px) 100vw, 390px" />
                : <span className={styles.monogram} aria-hidden="true">آ</span>}
              <span className={styles.cardLabel}>نموذج من نقادة</span>
            </span>
            <span className={styles.cardBody}>
              <small>{person.locality}</small>
              <strong>{person.name}</strong>
              <span>{person.shortTitle}</span>
              <b>اقرأ الحكاية <i aria-hidden="true">←</i></b>
            </span>
          </Link>
        </article>)}
      </div>
      <aside className={styles.contribute}>
        <div><span>تعرف حد يستحق نحكي عنه؟</span><h2>الخير في بلدنا كثير، والحكايات لسه ما خلصتش.</h2><p>ابعت لنا اسم الشخص ومعلومات يمكن مراجعتها ومصدر الصور، ونراجع القصة قبل نشرها.</p></div>
        <Link href="/contribute">شاركنا الحكاية <span aria-hidden="true">←</span></Link>
      </aside>
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(collection) }} />
  </main>;
}
