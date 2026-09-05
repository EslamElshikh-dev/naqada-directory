import type { Metadata } from 'next';
import Link from 'next/link';
import { localities } from '@/lib/data';
import { editorialPosts } from '@/lib/editorial-posts';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import { getVillageArticle, villageArticleAuthor, villageArticles } from '@/lib/village-articles';
import styles from './blog.module.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'مدونة دليل نقادة | حكايات ومقالات مصورة من نقادة',
  description: 'مدونة دليل نقادة: مقالات محلية أصلية ومصورة عن قرى ونجوع مركز نقادة، تاريخها وعائلاتها ومعالمها وخدماتها وحكايات الحياة اليومية.',
  path: '/blog',
});

function articleHref(localityName: string) {
  const locality = localities.find((item) => getVillageArticle(item.name)?.locality === localityName);
  return locality ? `/villages/${locality.slug}` : '/villages';
}

function editorialImage(asset: string) {
  return `${siteConfig.url}/blog-media/${encodeURIComponent(asset)}`;
}

export default function BlogPage() {
  const blogUrl = `${siteConfig.url}/blog`;
  const totalPosts = villageArticles.length + editorialPosts.length;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${blogUrl}#blog`,
        name: 'مدونة دليل نقادة',
        description: 'حكايات ومقالات محلية مصورة عن قرى ونجوع مركز نقادة بمحافظة قنا.',
        url: blogUrl,
        inLanguage: 'ar-EG',
        image: editorialPosts[0] ? editorialImage(editorialPosts[0].hero.asset) : siteConfig.socialImage,
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
        blogPost: [
          ...editorialPosts.map((post) => ({
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.publishedAt,
            dateModified: post.modifiedAt,
            image: editorialImage(post.hero.asset),
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
            url: `${siteConfig.url}/blog/${post.slug}`,
          })),
          ...villageArticles.map((article) => ({
            '@type': 'BlogPosting',
            headline: article.title,
            description: article.description,
            datePublished: article.publishedAt,
            dateModified: article.modifiedAt,
            image: siteConfig.socialImage,
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
            url: `${siteConfig.url}${articleHref(article.locality)}`,
          })),
        ],
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
          <p>مقالات عن القرى والنجوع، الناس والذاكرة، المدارس والدواوين والمعالم والخدمات؛ ومع السلسلة الجديدة أضفنا صورًا توضيحية مخصصة وسكيما صور وبيانات أرشفة أقوى لكل مقال مستقل.</p>
          <div className={styles.stats}>
            <span><b>{totalPosts.toLocaleString('ar-EG')}</b> مقالات منشورة</span>
            <span><b>{villageArticleAuthor.name}</b> الكاتب والمحرر</span>
            <span>محتوى محلي أصلي لمركز نقادة</span>
          </div>
        </div>
      </section>

      <section className={`shell ${styles.archive}`}>
        {editorialPosts.length > 0 && (
          <div className={styles.editorialBlock}>
            <div className={styles.heading}>
              <div>
                <span>السلسلة الجديدة · مقالات مصورة مستقلة</span>
                <h2>موضوعات من داخل القرية، مش مجرد تعريف بالقرية</h2>
                <p>كل مقال هنا له نية بحث مستقلة وصور مرتبطة بموضوعه ومصادر حديثة وروابط داخلية للصفحة المرجعية للمكان، عشان ما يحصلش تكرار أو تنافس بين صفحات الموقع.</p>
              </div>
            </div>
            <div className={styles.editorialGrid}>
              {editorialPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.editorialCard}>
                  <img src={`/blog-media/${post.hero.asset}`} width={post.hero.width} height={post.hero.height} alt={post.hero.alt} loading="lazy" decoding="async" />
                  <div className={styles.editorialCardBody}>
                    <div className={styles.cardTop}>
                      <span>{post.locality}</span>
                      <time dateTime={post.modifiedAt}>٥ سبتمبر ٢٠٢٦</time>
                    </div>
                    <h2>{post.title}</h2>
                    <p>{post.description}</p>
                    <div className={styles.cardFooter}>
                      <span>بقلم {villageArticleAuthor.name}</span>
                      <b>اقرأ المقال المصور ←</b>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className={styles.heading}>
          <div>
            <span>دليل القرى والنجوع</span>
            <h2>اقرأ نقادة نجعًا نجعًا</h2>
            <p>صفحات مرجعية تجمع حكاية المكان وموقعه وملامحه ثم تقود مباشرة إلى الخدمات والأنشطة المرتبطة به في الدليل.</p>
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
