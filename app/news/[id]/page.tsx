import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NewsImage } from '@/components/news-image';
import { getLatestNews } from '@/lib/news';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import styles from './story.module.css';

export const dynamic = 'force-dynamic';

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
  const feed = await getLatestNews();
  const item = feed.items.find((story) => story.id === id);
  if (!item) return { robots: { index: false, follow: true } };

  return {
    title: item.title,
    description: item.description || `معاينة خبر منشور لدى ${item.source} مع رابط مباشر إلى المصدر الأصلي.`,
    alternates: { canonical: item.url },
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url: item.url,
      title: item.title,
      description: item.description,
      siteName: item.source,
      publishedTime: item.publishedAt || undefined,
      images: item.imageUrl ? [{ url: item.imageUrl, alt: item.imageAlt }] : [siteConfig.socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title,
      description: item.description,
      images: [item.imageUrl || siteConfig.socialImage],
    },
  };
}

export default async function NewsStoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const feed = await getLatestNews();
  const item = feed.items.find((story) => story.id === id);
  if (!item) notFound();

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
        isBasedOn: item.url,
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
            <figure className={styles.figure}>
              <NewsImage src={item.imageUrl} alt={item.imageAlt} priority sizes="(max-width: 900px) calc(100vw - 28px), 790px" />
              <figcaption>صورة الخبر كما قدمها المصدر · الحقوق لـ {item.source}</figcaption>
            </figure>

            <section className={styles.summary} aria-labelledby="story-summary-title">
              <span>ملخص المصدر</span>
              <h2 id="story-summary-title">الخبر في سطور</h2>
              <p>{item.description || 'لم يرسل المصدر ملخصًا لهذا الخبر. يمكنك فتح الرابط الأصلي لقراءة التفاصيل الكاملة.'}</p>
            </section>

            <section className={styles.continueCard} aria-label="متابعة الخبر من المصدر">
              <span className={styles.continueIcon} aria-hidden="true">↗</span>
              <div>
                <small>التفاصيل الكاملة لدى الناشر</small>
                <strong>أكمل قراءة الخبر من {item.source}</strong>
                <p>سينقلك الزر إلى صفحة الخبر الأصلية، حيث النص الكامل والصور أو التحديثات اللاحقة.</p>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer external">فتح الخبر الأصلي <b aria-hidden="true">↗</b></a>
            </section>

            <section className={styles.editorialNote} aria-labelledby="editorial-note-title">
              <h2 id="editorial-note-title">لماذا لا نعرض النص كاملًا؟</h2>
              <p>دليل نقادة يجمع الوصول إلى الخبر ولا يعيد نشر عمل الصحف. نحافظ على اسم المصدر وحقوق الصورة ونرسل القارئ إلى الناشر للاستفادة من التغطية الأصلية كاملة.</p>
            </section>
          </div>

          <aside className={styles.side}>
            <section className={styles.sourceCard}>
              <span>بطاقة المصدر</span>
              <strong>{item.source}</strong>
              <p>العنوان والملخص والصورة مستلمة من بيانات المصدر العامة، ولم يحرر دليل نقادة مضمون الخبر.</p>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer external">زيارة موقع المصدر <b aria-hidden="true">↗</b></a>
            </section>
            <section className={styles.statusCard}>
              <span><i aria-hidden="true" /> رابط موثّق</span>
              <p>الرابط يستخدم اتصالًا آمنًا ويقود إلى نطاق الناشر المعروف.</p>
            </section>
          </aside>
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

