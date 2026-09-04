import type { Metadata } from 'next';
import Link from 'next/link';
import { localities } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import { getVillageArticle, villageArticleAuthor, villageArticles } from '@/lib/village-articles';
import styles from './blog.module.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'مدونة دليل نقادة | حكايات قرى ونجوع نقادة',
  description: 'مدونة دليل نقادة: مقالات محلية أصلية عن قرى ونجوع مركز نقادة، تاريخها وعائلاتها ومعالمها وخدماتها وحكايات الحياة اليومية بلغة قريبة من أهل المكان.',
  path: '/blog',
});

function articleHref(localityName: string) {
  const locality = localities.find((item) => getVillageArticle(item.name)?.locality === localityName);
  return locality ? `/villages/${locality.slug}` : '/villages';
}

export default function BlogPage() {
  const blogUrl = `${siteConfig.url}/blog`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${blogUrl}#blog`,
        name: 'مدونة دليل نقادة',
        description: 'حكايات ومقالات محلية عن قرى ونجوع مركز نقادة بمحافظة قنا.',
        url: blogUrl,
        inLanguage: 'ar-EG',
        author: {
          '@type': 'Person',
          name: villageArticleAuthor.name,
          url: `${siteConfig.url}${villageArticleAuthor.href}`,
        },
        blogPost: villageArticles.map((article) => ({
          '@type': 'BlogPosting',
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          dateModified: article.modifiedAt,
          url: `${siteConfig.url}${articleHref(article.locality)}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'المدونة', item: blogUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content">
      <section className={styles.hero}>
        <div className={`shell ${styles.heroInner}`}>
          <span className={styles.kicker}>مدونة دليل نقادة · حكايات من قلب المكان</span>
          <h1>نقادة كما يعرفها أهلها… <em>مش كما تختصرها الخريطة.</em></h1>
          <p>مقالات عن القرى والنجوع، الناس والذاكرة، المدارس والدواوين والمعالم والخدمات؛ بمعلومة دقيقة، وحكي خفيف، ولمسة دعابة صعيدية في وقتها من غير ما المقال يتحول فقرة ستاند أب.</p>
          <div className={styles.stats}>
            <span><b>{villageArticles.length.toLocaleString('ar-EG')}</b> مقالات منشورة</span>
            <span><b>{villageArticleAuthor.name}</b> الكاتب والمحرر</span>
            <span>محتوى محلي أصلي لمركز نقادة</span>
          </div>
        </div>
      </section>

      <section className={`shell ${styles.archive}`}>
        <div className={styles.heading}>
          <div>
            <span>أحدث الحكايات المحلية</span>
            <h2>اقرأ نقادة نجعًا نجعًا</h2>
            <p>كل مقال مرتبط بصفحة المكان نفسها حتى تظل المعلومة والخدمات والـSEO في عنوان واحد قوي بدل تشتيت المحتوى بين روابط متنافسة.</p>
          </div>
          <Link href="/villages" className="text-link">استكشف كل القرى والنجوع ←</Link>
        </div>

        <div className={styles.grid}>
          {villageArticles.map((article) => (
            <Link key={article.locality} href={articleHref(article.locality)} className={styles.card}>
              <div className={styles.cardTop}>
                <span>{article.locality}</span>
                <time dateTime={article.modifiedAt}>٤ سبتمبر ٢٠٢٦</time>
              </div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <div className={styles.cardFooter}>
                <span>بقلم {villageArticleAuthor.name}</span>
                <b>اقرأ المقال ←</b>
              </div>
            </Link>
          ))}
        </div>

        <aside className={styles.authorBand} aria-label="كاتب مدونة دليل نقادة">
          <div className={styles.authorMark} aria-hidden="true">إش</div>
          <div>
            <span>كتب وحرّر مقالات المدونة</span>
            <strong>{villageArticleAuthor.name}</strong>
            <p>{villageArticleAuthor.role} · {villageArticleAuthor.bio}</p>
          </div>
          <Link href={villageArticleAuthor.href}>عن الكاتب والدليل ←</Link>
        </aside>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(schema) }} />
    </main>
  );
}
