import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NewsImage } from '@/components/news-image';
import { getExpandedNewsBody, getLatestNews, getNewsItem } from '@/lib/news';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import styles from './story.module.css';
import { NewsShare } from './news-share';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type StoryPageProps = { params: Promise<{ id: string }> };

function formatNewsDate(value: string) {
  if (!value) return 'وقت النشر غير متاح';
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Cairo',
  }).format(new Date(value));
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) return { robots: { index: false, follow: true } };

  return {
    title: item.title,
    description: item.description || `معاينة خبر منشور لدى ${item.source} مع رابط مباشر إلى المصدر الأصلي.`,
    alternates: { canonical: item.isOriginal ? `/news/${item.id}` : item.url },
    robots: {
      index: Boolean(item.isOriginal),
      follow: true,
      googleBot: { index: Boolean(item.isOriginal), follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url: `${siteConfig.url}/news/${item.id}/`,
      title: item.title,
      description: item.description,
      siteName: 'دليل نقادة',
      publishedTime: item.publishedAt || undefined,
      images: [{ url: `${siteConfig.url}/news/${item.id}/opengraph-image`, width: 1200, height: 630, alt: `${item.title} · ${item.source} · دليل نقادة` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title,
      description: item.description,
      images: [`${siteConfig.url}/news/${item.id}/opengraph-image`],
    },
  };
}

export default async function NewsStoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) notFound();
  const [feed, generatedBody] = await Promise.all([getLatestNews(), getExpandedNewsBody(item)]);
  const detailedBody = item.editorialBody || generatedBody;

  const related = feed.items
    .filter((story) => story.id !== item.id && (story.category === item.category || story.isNaqada === item.isNaqada))
    .slice(0, 3);
  const previewUrl = `${siteConfig.url}/news/${item.id}/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${previewUrl}#preview`,
        name: item.title,
        description: item.description,
        url: previewUrl,
        inLanguage: 'ar-EG',
        isBasedOn: item.isOriginal ? undefined : item.url,
        primaryImageOfPage: item.imageUrl ? {
          '@type': 'ImageObject',
          url: item.imageUrl,
          caption: `صورة الخبر من ${item.source}`,
        } : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'الأخبار', item: `${siteConfig.url}/news/` },
          { '@type': 'ListItem', position: 3, name: item.title, item: previewUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className={styles.page}>
      <article>
        <header className={styles.hero}>
          <div className={`shell ${styles.heroInner}`}>
            <nav className={styles.breadcrumbs} aria-label="مسار الخبر">
              <Link href="/">الرئيسية</Link><span>/</span><Link href="/news">الأخبار</Link><span>/</span><span>{item.category}</span>
            </nav>
            <div className={styles.labels}><span>{item.category}</span><b>{item.isNaqada ? 'نقادة' : 'قنا'}</b></div>
            <h1>{item.title}</h1>
            <div className={styles.byline}>
              <span className={styles.sourceMark} aria-hidden="true">{item.source.replace('بوابة ', '').slice(0, 1)}</span>
              <div><small>نشر الخبر</small><strong>{item.source}</strong></div>
              <time dateTime={item.publishedAt || undefined}>{formatNewsDate(item.publishedAt)}</time>
            </div>
          </div>
        </header>

        <div className={`shell ${styles.layout}`}>
          <div className={styles.mainColumn}>
            {!item.isOriginal ? <figure className={styles.figure}>
              <NewsImage src={item.imageUrl} alt={item.imageAlt} priority sizes="(max-width: 900px) calc(100vw - 28px), 790px" />
              <figcaption>صورة الخبر كما قدمها المصدر · الحقوق لـ {item.source}</figcaption>
            </figure> : null}

            <section className={styles.summary} aria-labelledby="story-summary-title">
              <span>{item.isOriginal ? 'خبر محلي · دليل نقادة' : detailedBody ? 'تغطية موسعة · مع ذكر المصدر' : 'الملخص المتاح من المصدر'}</span>
              <h2 id="story-summary-title">{detailedBody ? 'تفاصيل الخبر' : 'ما ورد في الخبر'}</h2>
              {detailedBody && item.description ? <div className={styles.summaryLead}><strong>في سطور</strong><p>{item.description}</p></div> : null}
              {detailedBody
                ? detailedBody.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)
                : <p>{item.description || 'لم يرسل المصدر تفاصيل كافية لهذا الخبر. ستجد التغطية الأصلية في قسم المصادر أدناه.'}</p>}
              {generatedBody ? <p className={styles.editorialDisclosure}>صياغة آلية للوقائع المنشورة لدى {item.source}؛ راجع الخبر الأصلي عند وجود تحديثات أو تصحيحات.</p> : null}
            </section>
            <NewsShare title={item.title} url={previewUrl} />
          </div>

          {!item.isOriginal ? <aside className={styles.side}>
            <section className={styles.sourceCard}>
              <span>روابط المصدر</span>
              <strong>{item.source}</strong>
              <p>التغطية الأصلية، والصور والتحديثات والتصحيحات لدى الناشر.</p>
              <a className={styles.sourcePrimary} href={item.url} target="_blank" rel="noopener noreferrer external">قراءة من المصدر <b aria-hidden="true">↗</b></a>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer external">زيارة موقع الناشر <b aria-hidden="true">↗</b></a>
            </section>
            <section className={styles.statusCard}>
              <span><i aria-hidden="true" /> رابط موثّق</span>
              <p>الرابط يستخدم اتصالًا آمنًا ويقود إلى نطاق الناشر المعروف.</p>
            </section>
          </aside> : null}
        </div>
      </article>

      {related.length ? (
        <section className={styles.related} aria-labelledby="related-news-title">
          <div className="shell">
            <div className={styles.relatedHeading}>
              <div><span>تابع المشهد</span><h2 id="related-news-title">أخبار مرتبطة</h2></div>
              <Link href="/news">كل الأخبار ←</Link>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((story) => (
                <Link href={`/news/${story.id}`} className={styles.relatedCard} key={story.id}>
                  <span className={styles.relatedMedia}>
                    <NewsImage src={story.imageUrl} alt={story.imageAlt} sizes="(max-width: 700px) 120px, 260px" />
                  </span>
                  <span className={styles.relatedCopy}>
                    <small>{story.source} · {story.category}</small>
                    <strong>{story.title}</strong>
                    <b>افتح المعاينة ←</b>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
