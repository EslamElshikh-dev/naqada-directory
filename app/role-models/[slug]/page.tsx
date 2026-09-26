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
  const socialPhoto = person.photos[person.socialPhotoIndex ?? 0];
  const socialImage = socialPhoto ? new URL(socialPhoto.src, siteConfig.url).toString() : siteConfig.socialImage;
  return {
    title: person.name + ' | نماذج مشرفة في نقادة',
    description: person.description,
    keywords: [person.name, ...(person.alternateNames || []), 'نماذج مشرفة في نقادة', person.locality, 'مركز نقادة'],
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
      images: [{ url: socialImage, ...(socialPhoto ? { width: socialPhoto.width, height: socialPhoto.height } : {}), alt: socialPhoto?.alt || 'دليل نقادة' }],
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
        isBasedOn: [person.sourceUrl, ...(person.additionalSources || []).map((source) => source.url)],
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
        alternateName: person.alternateNames,
        ...(person.diedAt ? { deathDate: person.diedAt } : {}),
        description: person.shortTitle,
        url,
        ...(person.photos[0] ? { image: new URL(person.photos[0].src, siteConfig.url).toString() } : {}),
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

  return <main id="main-content" className={styles.page + (['aya-refai-abdelshafi', 'mahmoud-ahmed-abdel-sabour'].includes(person.slug) ? ' ' + styles.ayaProfile : '') + (person.diedAt ? ' ' + styles.memorialProfile : '')}>
    <article>
      <header className={styles.articleHero}>
        <div className={'shell ' + styles.articleHeroInner}>
          <nav className={styles.breadcrumbs} aria-label="مسار المقال"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><Link href="/role-models">نماذج مشرفة</Link><span aria-hidden="true">/</span><span aria-current="page">{person.name}</span></nav>
          <div className={styles.articleHeroGrid}>
            <div>
              <span className={styles.eyebrow}>نماذج مشرفة في نقادة · {person.locality}</span>
              <h1>{person.name}</h1>
              <p>{person.shortTitle}</p>
              <div className={styles.heroTags}>{person.heroTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className={styles.heroActions}><a href="#story">ابدأ الحكاية <span aria-hidden="true">↙</span></a><a href="#gallery">شوف الصور <span aria-hidden="true">↙</span></a></div>
            </div>
            <div className={styles.articlePortrait}>
              {person.photos[0]
                ? <Image src={person.photos[0].src} alt={person.photos[0].alt} width={person.photos[0].width} height={person.photos[0].height} sizes="(max-width: 850px) calc(100vw - 40px), 420px" style={person.photos[0].heroPosition ? { objectPosition: person.photos[0].heroPosition } : undefined} priority />
                : <div className={styles.portraitArtwork} aria-hidden="true"><span>{person.name.slice(0, 1)}</span><small>من نقادة… وحكايتهم تستاهل</small></div>}
              <span className={styles.portraitCaption}>{person.name}<small>{person.locality}</small></span>
            </div>
          </div>
        </div>
      </header>

      <nav className={'shell ' + styles.storyTrail} aria-label="محطات الحكاية">
        <a href="#story"><span>بداية</span><strong>الحكاية</strong></a>
        {person.sections.map((section, index) => <a key={section.heading} href={'#chapter-' + (index + 1)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{section.heading}</strong></a>)}
        {person.photos.length > 1 && <a href="#gallery"><span>صور</span><strong>من الرحلة</strong></a>}
      </nav>

      <div className={'shell ' + styles.articleLayout}>
        <div className={styles.articleBody}>
          <div className={styles.articleLead} id="story">
            <span>الحكاية</span>
            {person.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className={styles.highlights} aria-label="أبرز محاور القصة">
            {person.highlights.map((highlight, index) => <div key={highlight}><small>{String(index + 1).padStart(2, '0')}</small><strong>{highlight}</strong></div>)}
          </div>
          {person.sections.map((section, index) => <section className={styles.articleSection} key={section.heading} id={'chapter-' + (index + 1)}>
            <span>المحطة {String(index + 1).padStart(2, '0')}</span>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>)}
          {person.photos.length > 1 && <section className={styles.gallery} id="gallery" aria-labelledby="gallery-title">
            <div className={styles.sectionHeading}><div><span>من القصة</span><h2 id="gallery-title">صور من حكاية {person.name}</h2></div></div>
            <div className={styles.galleryGrid + (person.photos.length === 2 ? ' ' + styles.galleryGridSingle : '')}>{person.photos.slice(1).map((photo, index) => <figure key={photo.src} className={index === person.photos.length - 2 && person.photos.length > 4 ? styles.galleryFeature : undefined}>
              <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) 45vw, 380px" />
              <span className={styles.galleryNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(person.photos.length - 1).padStart(2, '0')}</span>
              <figcaption>{photo.caption}</figcaption>
            </figure>)}</div>
          </section>}
          <section className={styles.sourceNote} id="source" aria-labelledby="source-title">
            <span>الشفافية في الحكاية</span>
            <h2 id="source-title">المصدر وما نعرفه</h2>
            <p>{person.sourceDisclosure}</p>
            <a href={person.sourceUrl} target="_blank" rel="noopener noreferrer external">{person.sourceLabel} <span aria-hidden="true">↗</span></a>
            {person.additionalSources?.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer external">{source.label} <span aria-hidden="true">↗</span></a>)}
          </section>
          <div className={styles.articleEnd}><Link href="/role-models">شوف نماذج مشرفة تانية <span aria-hidden="true">←</span></Link></div>
        </div>
        <aside className={styles.articleSide} aria-label="معلومات عن المقال">
          <div className={styles.sideCard}><small>الاسم</small><strong>{person.name}</strong><small>من</small><b>{person.locality}</b></div>
          <nav className={styles.sideCard} aria-label="أقسام المقال"><strong>محطات الحكاية</strong><a href="#story">بداية الحكاية</a>{person.sections.map((section, index) => <a key={section.heading} href={'#chapter-' + (index + 1)}>{section.heading}</a>)}{person.photos.length > 1 && <a href="#gallery">الصور</a>}<a href="#source">المصدر والتصحيحات</a></nav>
          <div className={styles.sideCard}><strong>{person.interestsLabel || 'اهتمامات مذكورة'}</strong><div className={styles.interestList}>{person.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div>
        </aside>
      </div>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(story) }} />
  </main>;
}
