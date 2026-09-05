import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allEditorialPosts, getAllEditorialPost } from '@/lib/editorial-posts-all';
import { localities } from '@/lib/data';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import { villageArticleAuthor } from '@/lib/village-articles';
import styles from './post.module.css';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allEditorialPosts.map((post) => ({ slug: post.slug }));
}

function imageUrl(asset: string) {
  return `${siteConfig.url}/blog-media/${encodeURIComponent(asset)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getAllEditorialPost(slug);
  if (!post) return {};
  const url = `${siteConfig.url}/blog/${post.slug}`;
  const hero = imageUrl(post.hero.asset);

  return {
    title: post.seoTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url,
      title: post.title,
      description: post.description,
      siteName: siteConfig.shortName,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [villageArticleAuthor.name],
      images: [{ url: hero, width: post.hero.width, height: post.hero.height, alt: post.hero.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [hero],
    },
  };
}

export default async function EditorialPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getAllEditorialPost(slug);
  if (!post) notFound();

  const canonicalUrl = `${siteConfig.url}/blog/${post.slug}`;
  const heroUrl = imageUrl(post.hero.asset);
  const relatedLocality = localities.find((item) => item.name === post.relatedVillage);
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
          width: image.width,
          height: image.height,
          caption: image.caption,
        })),
        about: { '@type': 'Place', name: post.locality, containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز نقادة، قنا، مصر' } },
        author: {
          '@type': 'Person',
          name: villageArticleAuthor.name,
          url: `${siteConfig.url}${villageArticleAuthor.href}`,
        },
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
                  <span>بقلم {villageArticleAuthor.name}</span>
                  <time dateTime={post.publishedAt}>٥ سبتمبر ٢٠٢٦</time>
                  <span>مقال محلي مصوّر</span>
                </div>
              </div>
              <figure className={styles.heroFigure}>
                <img src={heroUrl} width={post.hero.width} height={post.hero.height} alt={post.hero.alt} fetchPriority="high" />
                <figcaption>{post.hero.caption}</figcaption>
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
              <p>الصور التوضيحية المولدة بصريًا في هذا المقال صُممت لتعكس السياق العام للموضوع، ولا تُقدَّم باعتبارها صورًا توثيقية لمعلم أو أشخاص حقيقيين بعينهم.</p>
            </aside>

            {post.sections.map((section, index) => (
              <section key={section.heading} id={`section-${index + 1}`} className={styles.section}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.image && (
                  <figure className={styles.inlineFigure}>
                    <img src={imageUrl(section.image.asset)} width={section.image.width} height={section.image.height} alt={section.image.alt} loading="lazy" decoding="async" />
                    <figcaption>{section.image.caption}</figcaption>
                  </figure>
                )}
              </section>
            ))}

            {relatedLocality && (
              <aside className={styles.villageBridge}>
                <span>الصفحة المرجعية للمكان</span>
                <strong>عايز تعرف {post.locality} نفسها من أول الحكاية؟</strong>
                <p>صفحة المكان تجمع الموقع والهوية المحلية والخدمات، بينما المقال الحالي يركز على موضوع مستقل داخل {post.locality} بزاوية أعمق ومصادر وصور مخصصة.</p>
                <Link href={`/villages/${relatedLocality.slug}`}>فتح دليل {post.locality} الكامل ←</Link>
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
              <div className={styles.authorMark} aria-hidden="true">إش</div>
              <div>
                <span>كتب وبحث وحرّر</span>
                <strong>{villageArticleAuthor.name}</strong>
                <small>{villageArticleAuthor.role}</small>
                <p>{villageArticleAuthor.bio}</p>
                <Link href={villageArticleAuthor.href}>عن الكاتب ودليل نقادة ←</Link>
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
