import Image from 'next/image';
import Link from 'next/link';
import type { EditorialPost } from '@/lib/editorial-posts';
import { localities } from '@/lib/data';
import { editorialImagePath } from '@/lib/editorial-image-path';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import { villageArticleAuthor } from '@/lib/village-articles';
import styles from './post.module.css';

function imageUrl(asset: string) {
  return `${siteConfig.url}${editorialImagePath(asset)}`;
}

function localImageUrl(asset: string) {
  return editorialImagePath(asset);
}

function formatArticleDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function EditorialPostArticle({ post }: { post: EditorialPost }) {
  const authorName = post.authorName || villageArticleAuthor.name;
  const defaultAuthor = authorName === villageArticleAuthor.name;
  const authorHref = post.authorUrl || (defaultAuthor ? villageArticleAuthor.href : '');
  const authorRole = post.authorRole || (defaultAuthor ? villageArticleAuthor.role : '');
  const authorBio = post.authorBio || (defaultAuthor ? villageArticleAuthor.bio : '');
  const canonicalUrl = `${siteConfig.url}/blog/${post.slug}`;
  const relatedLocality = localities.find((item) => item.name === post.relatedVillage);
  const isDirectLocalityPage = post.locality === post.relatedVillage;
  const allImages = [post.hero, ...post.sections.flatMap((section) => section.image ? [section.image] : [])];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${canonicalUrl}#article`,
        headline: post.title,
        description: post.description,
        keywords: post.keywords.join(', '),
        inLanguage: 'ar-EG',
        datePublished: post.publishedAt,
        dateModified: post.modifiedAt,
        mainEntityOfPage: canonicalUrl,
        image: allImages.map((image) => ({
          '@type': 'ImageObject',
          url: imageUrl(image.asset),
          contentUrl: imageUrl(image.asset),
          width: image.width,
          height: image.height,
          name: image.alt,
          description: image.alt,
          caption: image.caption,
        })),
        about: { '@type': 'Place', name: post.locality, containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز نقادة، قنا، مصر' } },
        author: { '@type': 'Person', name: authorName, ...(authorHref ? { url: new URL(authorHref, siteConfig.url).toString() } : {}) },
        publisher: {
          '@type': 'Organization',
          name: siteConfig.shortName,
          url: siteConfig.url,
          logo: { '@type': 'ImageObject', url: siteConfig.logoImage },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'المدونة', item: `${siteConfig.url}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: post.faqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <main id="main-content" className={styles.page}>
      <article>
        <header className={styles.hero}>
          <div className="shell">
            <nav className={styles.breadcrumbs} aria-label="مسار المقال">
              <Link href="/">الرئيسية</Link><span>/</span><Link href="/blog">المدونة</Link><span>/</span><span>{post.locality}</span>
            </nav>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <div className={styles.kicker}><span>{post.category}</span><span>{post.locality}</span></div>
                <h1>{post.title}</h1>
                <p>{post.excerpt}</p>
                <div className={styles.meta}>
                  <span>بقلم {authorHref ? <Link href={authorHref} rel="author">{authorName}</Link> : authorName}</span>
                  <time dateTime={post.publishedAt}>{formatArticleDate(post.publishedAt)}</time>
                  <span>مقال محلي مصوّر</span>
                </div>
              </div>
              <figure className={styles.heroFigure}>
                <Image
                  src={localImageUrl(post.hero.asset)}
                  width={post.hero.width}
                  height={post.hero.height}
                  alt={post.hero.alt}
                  unoptimized={post.hero.asset.startsWith('/api/article-media/')}
                  priority
                  sizes="(max-width: 900px) calc(100vw - 20px), 46vw"
                />
                <figcaption>{post.hero.caption}{post.hero.originalAsset && <a className={styles.originalLink} href={localImageUrl(post.hero.originalAsset)} target="_blank" rel="noreferrer">شاهد الصورة الأصلية ↗</a>}</figcaption>
              </figure>
            </div>
          </div>
        </header>

        <div className={`shell ${styles.layout}`}>
          <div className={styles.content}>
            <div className={styles.lead}>
              {post.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>

            <aside className={styles.imageNotice}>
              <strong>ملاحظة على الصور</strong>
              <p>{post.imageNotice || 'الصور التوضيحية المولدة بصريًا في هذا المقال صُممت لتعكس السياق العام للموضوع، ولا تُقدَّم باعتبارها صورًا توثيقية لمعلم أو أشخاص حقيقيين بعينهم.'}</p>
            </aside>

            {post.sections.map((section, index) => (
              <section key={section.heading} id={`section-${index + 1}`} className={styles.section}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.timeline && <ol className={styles.timeline}>
                  {section.timeline.map((entry) => <li key={entry.name}>
                    <span>{entry.period}</span>
                    <h3>{entry.name}</h3>
                    <p>{entry.description}</p>
                  </li>)}
                </ol>}
                {section.sources && <div className={styles.sectionSources} aria-label="مصادر هذا القسم">
                  {section.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}
                </div>}
                {section.image && (
                  <figure className={styles.inlineFigure}>
                    <Image
                      unoptimized={section.image.asset.startsWith('/api/article-media/')}
                      src={localImageUrl(section.image.asset)}
                      width={section.image.width}
                      height={section.image.height}
                      alt={section.image.alt}
                      sizes="(max-width: 900px) calc(100vw - 20px), 860px"
                    />
                    <figcaption>{section.image.caption}{section.image.originalAsset && <a className={styles.originalLink} href={localImageUrl(section.image.originalAsset)} target="_blank" rel="noreferrer">افتح الأصل بالحجم الكامل ↗</a>}</figcaption>
                  </figure>
                )}
              </section>
            ))}

            {relatedLocality && (
              <aside className={styles.villageBridge}>
                <span>{isDirectLocalityPage ? 'الصفحة المرجعية للمكان' : 'المكان في سياقه المحلي'}</span>
                <strong>
                  {isDirectLocalityPage
                    ? `عايز تعرف ${post.locality} نفسها من أول الحكاية؟`
                    : `عايز تربط ${post.locality} بالقرية الأم ${post.relatedVillage}؟`}
                </strong>
                <p>
                  {isDirectLocalityPage
                    ? `صفحة المكان تجمع الموقع والهوية المحلية والخدمات، بينما المقال الحالي يركز على موضوع مستقل داخل ${post.locality} بزاوية أعمق ومصادر وصور مخصصة.`
                    : `المقال الحالي يركز على ${post.locality}، بينما صفحة ${post.relatedVillage} تجمع السياق الجغرافي والخدمي الأوسع والمواضع المرتبطة بها داخل مركز نقادة.`}
                </p>
                <Link href={`/villages/${relatedLocality.slug}`}>فتح دليل {post.relatedVillage} الكامل ←</Link>
              </aside>
            )}

            <section className={styles.faq}>
              <h2>أسئلة شائعة ومفيدة عن {post.locality}</h2>
              {post.faqs.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>

            <section className={styles.sources}>
              <h2>المصادر والمراجع</h2>
              <p>المراجع التالية استُخدمت لتثبيت الوقائع المذكورة في المقال. الروابط الخارجية تفتح في نافذة جديدة.</p>
              <ol>
                {post.sources.map((source) => (
                  <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>
                ))}
              </ol>
            </section>

            <footer className={styles.authorCard}>
              <div className={styles.authorMark} aria-hidden="true">{defaultAuthor ? 'إش' : authorName.slice(0, 1)}</div>
              <div>
                <span>كتب وبحث وحرّر</span>
                <strong>{authorName}</strong>
                {authorRole && <small>{authorRole}</small>}
                {authorBio && <p>{authorBio}</p>}
                {authorHref && <Link href={authorHref} rel="author">عن الكاتب ←</Link>}
              </div>
            </footer>
          </div>

          <aside className={styles.side} aria-label="ملخص المقال">
            <div className={styles.sideCard}>
              <span>في المقال</span>
              <strong>{post.locality}</strong>
              <ul>
                {post.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index + 1}`}>{section.heading}</a></li>)}
              </ul>
            </div>
          </aside>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
