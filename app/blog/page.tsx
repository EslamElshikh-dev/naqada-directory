import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import { villageArticleAuthor } from '@/lib/village-articles';
import styles from './blog.module.css';
import editorialStyles from './editorial.module.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'مدونة دليل نقادة | حكايات ومقالات مصورة من نقادة',
  description: 'مدونة دليل نقادة: مقالات محلية أصلية ومصورة عن تاريخ نقادة وقراها ونجوعها والناس والمعالم والحياة اليومية، بنية بحث تحريرية مستقلة عن صفحات دليل القرى والخدمات.',
  path: '/blog',
});

function editorialImage(asset: string) {
  return `${siteConfig.url}/blog-media/${encodeURIComponent(asset)}`;
}

export default function BlogPage() {
  const blogUrl = `${siteConfig.url}/blog/`;
  const totalPosts = allEditorialPosts.length;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${blogUrl}#blog`,
        name: 'مدونة دليل نقادة',
        description: 'حكايات ومقالات محلية مصورة عن تاريخ وناس ومعالم مركز نقادة بمحافظة قنا.',
        url: blogUrl,
        inLanguage: 'ar-EG',
        image: allEditorialPosts[0] ? editorialImage(allEditorialPosts[0].hero.asset) : siteConfig.socialImage,
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
        blogPost: allEditorialPosts.map((post) => ({
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
          url: `${siteConfig.url}/blog/${post.slug}/`,
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
          <p>هذه مساحة المقالات التحريرية في دليل نقادة: موضوعات عن الناس والذاكرة والمدارس والدواوين والمعالم والحياة اليومية. أمّا البحث عن قرية أو خدمة بعينها فله صفحات دليل مستقلة حتى لا تتنافس نيات البحث مع بعضها.</p>
          <div className={styles.stats}>
            <span><b>{totalPosts.toLocaleString('ar-EG')}</b> مقالات تحريرية منشورة</span>
            <span><b>{villageArticleAuthor.name}</b> الكاتب والمحرر</span>
            <span><Link href="/villages">دليل القرى والنجوع ←</Link></span>
          </div>
        </div>
      </section>

      <section className={`shell ${styles.archive}`}>
        {allEditorialPosts.length > 0 && (
          <div className={editorialStyles.editorialBlock}>
            <div className={styles.heading}>
              <div>
                <span>مقالات مصورة مستقلة</span>
                <h2>موضوعات من داخل المكان، لا صفحات دليل مكررة</h2>
                <p>كل مقال هنا له زاوية تحريرية مستقلة مثل التاريخ أو الذاكرة أو الناس أو الحياة اليومية، بينما تظل عبارة «دليل + اسم القرية» مملوكة لصفحة القرية نفسها.</p>
              </div>
            </div>
            <div className={editorialStyles.editorialGrid}>
              {allEditorialPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className={editorialStyles.editorialCard}>
                  <Image
                    src={`/blog-media/${encodeURIComponent(post.hero.asset)}`}
                    width={post.hero.width}
                    height={post.hero.height}
                    alt={post.hero.alt}
                    sizes="(max-width: 680px) calc(100vw - 20px), 50vw"
                  />
                  <div className={editorialStyles.editorialCardBody}>
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
            <span>تبحث عن قرية أو نجع؟</span>
            <h2>انتقل إلى دليل قرى ونجوع نقادة</h2>
            <p>صفحات القرى هي الوجهة المرجعية لعبارات مثل «دليل بشلاو» و«دليل الأوسط قمولا» و«دليل طوخ» و«دليل الخطارة» و«دليل دنفيق»، وتربط كل موضع بالخدمات والأنشطة المنشورة داخله.</p>
          </div>
          <Link href="/villages" className="text-link">استكشف دليل القرى والنجوع ←</Link>
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
