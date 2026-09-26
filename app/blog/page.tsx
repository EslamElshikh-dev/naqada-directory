import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { getPublicCurated } from '@/lib/auth/moderator';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import { villageArticleAuthor } from '@/lib/village-articles';
import styles from './blog.module.css';
import editorialStyles from './editorial.module.css';
import curatedStyles from './curated-posts.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'مدونة دليل نقادة | حكايات ومقالات مصورة من نقادة',
  description: 'مدونة دليل نقادة: مقالات محلية أصلية ومصورة عن تاريخ نقادة وقراها ونجوعها والناس والمعالم والحياة اليومية، بنية بحث تحريرية مستقلة عن صفحات دليل القرى والخدمات.',
  path: '/blog',
});

function editorialImage(asset: string) {
  return `${siteConfig.url}/blog-media/${encodeURIComponent(asset)}`;
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

export default async function BlogPage() {
  const blogUrl = `${siteConfig.url}/blog/`;
  const curated = await getPublicCurated('article');
  const revisions = new Map(curated.filter((row) => row.origin === 'static').map((row) => [row.slug, row]));
  const originalPosts = curated.filter((row) => row.origin === 'original' && row.status === 'published');
  const displayPosts = allEditorialPosts.filter((post) => revisions.get(post.slug)?.status !== 'hidden')
    .map((post) => {
      const revision = revisions.get(post.slug);
      return revision?.status === 'published'
        ? { ...post, title: revision.payload.title || post.title,
            description: revision.payload.summary || post.description,
            excerpt: revision.payload.summary || post.excerpt,
            modifiedAt: revision.updatedAt.slice(0, 10) }
        : post;
    }).sort(
    (a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)
  );
  const totalPosts = displayPosts.length + originalPosts.length;
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
        image: displayPosts[0] ? editorialImage(displayPosts[0].hero.asset) : siteConfig.socialImage,
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
        blogPost: [...displayPosts.map((post) => ({
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
        })), ...originalPosts.map((post) => ({
          '@type': 'BlogPosting', headline: post.payload.title, description: post.payload.summary,
          datePublished: post.updatedAt, dateModified: post.updatedAt,
          author: { '@type': 'Organization', name: 'فريق دليل نقادة' },
          url: `${siteConfig.url}/blog/${post.slug}/`,
        }))],
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
        {originalPosts.length ? <section className={curatedStyles.section} aria-labelledby="editorial-original-title"><div><span>بقلم فريق الدليل</span><h2 id="editorial-original-title">مقالات محلية جديدة</h2></div><div className={curatedStyles.grid}>{originalPosts.map((post) => <Link href={`/blog/${post.slug}`} key={post.slug}><small>{post.payload.category || 'من نقادة'} · {post.payload.locality || 'مركز نقادة'}</small><h3>{post.payload.title}</h3><p>{post.payload.summary}</p><b>اقرأ المقال ←</b></Link>)}</div></section> : null}
        {displayPosts.length > 0 && (
          <div className={editorialStyles.editorialBlock}>
            <div className={styles.heading}>
              <div>
                <span>مقالات مصورة مستقلة</span>
                <h2>موضوعات من داخل المكان، لا صفحات دليل مكررة</h2>
                <p>كل مقال هنا له زاوية تحريرية مستقلة مثل التاريخ أو الذاكرة أو الناس أو الحياة اليومية، بينما تظل عبارة «دليل + اسم القرية» مملوكة لصفحة القرية نفسها.</p>
              </div>
            </div>
            <div className={editorialStyles.editorialGrid}>
              {displayPosts.map((post) => (
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
                      <time dateTime={post.modifiedAt}>{formatArticleDate(post.modifiedAt)}</time>
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
