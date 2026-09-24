import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRoleModel, roleModels } from '@/lib/role-models';
import { absoluteUrl, jsonLdStringify, siteConfig } from '@/lib/site';
import styles from '../role-models.module.css';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return roleModels.map((person) => ({ slug: person.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = getRoleModel(slug);
  if (!person) return { robots: { index: false, follow: true } };
  const url = absoluteUrl('/role-models/' + person.slug);
  const hero = person.photos[0];
  const socialImage = hero ? new URL(hero.src, siteConfig.url).toString() : siteConfig.socialImage;
  return {
    title: person.name + ' | نماذج مشرفة في نقادة',
    description: person.description,
    keywords: [person.name, person.name.split(' ').slice(0, 2).join(' '), 'نماذج مشرفة في نقادة', person.locality, 'مركز نقادة'],
    alternates: { canonical: '/role-models/' + person.slug },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url,
      title: person.name + ' | نماذج مشرفة في نقادة',
      description: person.description,
      siteName: siteConfig.shortName,
      publishedTime: person.publishedAt,
      modifiedTime: person.modifiedAt,
      images: [{ url: socialImage, alt: hero?.alt || 'دليل نقادة' }],
    },
    twitter: { card: 'summary_large_image', title: person.name + ' | نماذج مشرفة في نقادة', description: person.description, images: [socialImage] },
  };
}

export default async function RoleModelArticle({ params }: Props) {
  const { slug } = await params;
  const person = getRoleModel(slug);
  if (!person) notFound();
  const url = absoluteUrl('/role-models/' + person.slug);
  const story = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': url + '#article',
        headline: person.name + ' | نماذج مشرفة في نقادة',
        description: person.description,
        datePublished: person.publishedAt,
        dateModified: person.modifiedAt,
        inLanguage: 'ar-EG',
        mainEntityOfPage: url,
        isBasedOn: person.sourceUrl,
        about: { '@id': url + '#person' },
        ...(person.photos.length ? { image: person.photos.map((photo) => ({
          '@type': 'ImageObject',
          url: new URL(photo.src, siteConfig.url).toString(),
          width: photo.width,
          height: photo.height,
          caption: photo.caption,
        })) } : {}),
        author: { '@type': 'Organization', name: siteConfig.shortName, url: siteConfig.url },
        publisher: { '@type': 'Organization', name: siteConfig.shortName, url: siteConfig.url, logo: { '@type': 'ImageObject', url: siteConfig.logoImage } },
      },
      {
        '@type': 'Person',
        '@id': url + '#person',
        name: person.name,
        description: person.shortTitle,
        homeLocation: { '@type': 'Place', name: person.locality },
        subjectOf: { '@id': url + '#article' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'نماذج مشرفة في نقادة', item: absoluteUrl('/role-models') },
          { '@type': 'ListItem', position: 3, name: person.name, item: url },
        ],
      },
    ],
  };

  return <main id="main-content" className={styles.page}>
    <article>
      <header className={styles.articleHero}>
        <div className={'shell ' + styles.articleHeroInner}>
          <nav className={styles.breadcrumbs} aria-label="مسار المقال"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><Link href="/role-models">نماذج مشرفة</Link><span aria-hidden="true">/</span><span>{person.name}</span></nav>
          <div className={styles.articleHeroGrid}>
            <div>
              <span className={styles.eyebrow}>نماذج مشرفة في نقادة · {person.locality}</span>
              <h1>{person.name}</h1>
              <p>{person.shortTitle}</p>
              <div className={styles.heroTags}><span>تعليم</span><span>تطوع</span><span>تكنولوجيا</span></div>
            </div>
            <div className={styles.articlePortrait}>
              {person.photos[0]
                ? <Image src={person.photos[0].src} alt={person.photos[0].alt} width={person.photos[0].width} height={person.photos[0].height} sizes="(max-width: 850px) calc(100vw - 40px), 420px" priority />
                : <div className={styles.portraitArtwork} aria-hidden="true"><span>{person.name.slice(0, 1)}</span><small>من نقادة… وحكايتهم تستاهل</small></div>}
            </div>
          </div>
        </div>
      </header>

      <div className={'shell ' + styles.articleLayout}>
        <div className={styles.articleBody}>
          <div className={styles.articleLead}>
            <span>الحكاية</span>
            {person.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className={styles.highlights} aria-label="أبرز محاور القصة">
            {person.highlights.map((highlight, index) => <div key={highlight}><small>{String(index + 1).padStart(2, '0')}</small><strong>{highlight}</strong></div>)}
          </div>
          {person.sections.map((section, index) => <section className={styles.articleSection} key={section.heading} id={'chapter-' + (index + 1)}>
            <span>فصل {String(index + 1).padStart(2, '0')}</span>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>)}
          {person.photos.length > 1 && <section className={styles.gallery} aria-labelledby="gallery-title">
            <div className={styles.sectionHeading}><div><span>من القصة</span><h2 id="gallery-title">صور من حكاية {person.name}</h2></div></div>
            <div className={styles.galleryGrid}>{person.photos.slice(1).map((photo) => <figure key={photo.src}>
              <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 700px) calc(100vw - 40px), 380px" />
              <figcaption>{photo.caption}</figcaption>
            </figure>)}</div>
          </section>}
          <section className={styles.sourceNote} aria-labelledby="source-title">
            <span>الشفافية في الحكاية</span>
            <h2 id="source-title">المصدر وما نعرفه</h2>
            <p>هذا المقال تحرير محلي مبني على منشور «نماذج مشرفة في قنا» الذي قدّمته لنا. لم نتحقق بشكل مستقل من جميع الشهادات أو الألقاب؛ لذلك نُنسب التفاصيل إلى مصدرها. إذا كان لديك تصحيح موثق، يسعدنا مراجعته.</p>
            <a href={person.sourceUrl} target="_blank" rel="noopener noreferrer external">{person.sourceLabel} <span aria-hidden="true">↗</span></a>
          </section>
          <div className={styles.articleEnd}><Link href="/role-models">شوف نماذج مشرفة تانية <span aria-hidden="true">←</span></Link></div>
        </div>
        <aside className={styles.articleSide} aria-label="معلومات عن المقال">
          <div className={styles.sideCard}><small>الاسم</small><strong>{person.name}</strong><small>من</small><b>{person.locality}</b></div>
          <nav className={styles.sideCard} aria-label="أقسام المقال"><strong>في الحكاية</strong>{person.sections.map((section, index) => <a key={section.heading} href={'#chapter-' + (index + 1)}>{section.heading}</a>)}</nav>
          <div className={styles.sideCard}><strong>اهتمامات مذكورة</strong><div className={styles.interestList}>{person.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div>
        </aside>
      </div>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(story) }} />
  </main>;
}
