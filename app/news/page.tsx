import type { Metadata } from 'next';
import Link from 'next/link';
import { NewsImage } from '@/components/news-image';
import { getLatestNews, newsSourceDirectory, type ExternalNewsItem, type NewsCategory } from '@/lib/news';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';
import styles from './news.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'أخبار نقادة وقنا اليوم من مصادرها',
  description: 'أحدث أخبار نقادة ومحافظة قنا من المصادر الصحفية والرسمية، مع صورة الخبر واسم الناشر وتاريخ النشر ورابط مباشر للمصدر الأصلي.',
  path: '/news',
  keywords: ['أخبار نقادة', 'أخبار قنا اليوم', 'محافظة قنا', 'مركز نقادة', 'أخبار الصعيد'],
});

type NewsPageProps = {
  searchParams: Promise<{ section?: string }>;
};

const filters: Array<{ key: 'الكل' | NewsCategory | 'نقادة'; label: string }> = [
  { key: 'الكل', label: 'كل الأخبار' },
  { key: 'نقادة', label: 'نقادة أولًا' },
  { key: 'محليات', label: 'محليات' },
  { key: 'خدمات', label: 'خدمات ومرافق' },
  { key: 'تعليم', label: 'تعليم' },
  { key: 'صحة', label: 'صحة' },
  { key: 'مجتمع', label: 'مجتمع' },
];

function validFilter(value?: string) {
  return filters.find((filter) => filter.key === value)?.key || 'الكل';
}

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

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Cairo',
  }).format(new Date(value));
}

function sourceInitial(source: string) {
  return source.replace('بوابة ', '').replace('البوابة الرسمية لـ', '').trim().slice(0, 1);
}

function StoryMeta({ item }: { item: ExternalNewsItem }) {
  return (
    <div className={styles.storyMeta}>
      <span className={styles.sourceMark} aria-hidden="true">{sourceInitial(item.source)}</span>
      <span className={styles.sourceCopy}>
        <b>{item.source}</b>
        <time dateTime={item.publishedAt || undefined}>{formatNewsDate(item.publishedAt)}</time>
      </span>
      {item.isOfficial ? <span className={styles.official}>مصدر رسمي</span> : null}
    </div>
  );
}

function SourceButton({ item, compact = false }: { item: ExternalNewsItem; compact?: boolean }) {
  if (item.isOriginal) return <Link className={compact ? styles.sourceButtonCompact : styles.sourceButton} href={item.url}>اقرأ الخبر <b aria-hidden="true">←</b></Link>;
  return (
    <a
      className={compact ? styles.sourceButtonCompact : styles.sourceButton}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer external"
      aria-label={`اقرأ الخبر كاملًا من ${item.source} (يفتح في نافذة جديدة)`}
    >
      <span>اقرأ من المصدر</span>
      <b aria-hidden="true">↗</b>
    </a>
  );
}

function NewsCard({ item }: { item: ExternalNewsItem }) {
  return (
    <article className={styles.card} id={`story-${item.id}`}>
      <Link className={styles.cardMedia} href={`/news/${item.id}`} tabIndex={-1} aria-hidden="true">
        <NewsImage src={item.imageUrl} alt={item.imageAlt} sizes="(max-width: 720px) calc(100vw - 28px), (max-width: 1050px) 50vw, 360px" />
        <span className={styles.imageCredit}>الصورة: {item.source}</span>
        {item.isNaqada ? <span className={styles.localBadge}>نقادة</span> : null}
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}><StoryMeta item={item} /><span className={styles.category}>{item.category}</span></div>
        <h2><Link href={`/news/${item.id}`}>{item.title}</Link></h2>
        {item.description ? <p>{item.description}</p> : <p className={styles.descriptionFallback}>ملخص الخبر غير متاح من المصدر؛ افتح الرابط للاطلاع على التفاصيل الكاملة.</p>}
        <div className={styles.cardFooter}>
          <span>{item.isOriginal ? 'خبر من فريق الدليل' : 'نشر خارجي · الحقوق للمصدر'}</span>
          <SourceButton item={item} compact />
        </div>
      </div>
    </article>
  );
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const [{ section }, feed] = await Promise.all([searchParams, getLatestNews()]);
  const selected = validFilter(section);
  const filteredItems = selected === 'الكل'
    ? feed.items
    : selected === 'نقادة'
      ? feed.items.filter((item) => item.isNaqada)
      : feed.items.filter((item) => item.category === selected);
  const featured = filteredItems[0];
  const latest = filteredItems.slice(1);
  const sourceCount = new Set(feed.items.map((item) => item.source)).size;
  const newsUrl = `${siteConfig.url}/news/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${newsUrl}#page`,
        name: 'أخبار نقادة وقنا من مصادرها',
        description: 'واجهة تجمع عناوين أخبار نقادة ومحافظة قنا وتربط كل خبر بمصدره الأصلي.',
        url: newsUrl,
        inLanguage: 'ar-EG',
        isPartOf: { '@id': `${siteConfig.url}#website` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: feed.items.length,
          itemListElement: feed.items.slice(0, 20).map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title,
            url: item.isOriginal ? `${siteConfig.url}${item.url}` : item.url,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'الأخبار', item: newsUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}>
        <div className={`shell ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <nav className={styles.breadcrumbs} aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span>/</span><span>أخبار نقادة وقنا</span></nav>
            <span className={styles.kicker}><i aria-hidden="true" /> غرفة أخبار محلية متجددة</span>
            <h1>الخبر المحلي… <em>من مصدره.</em></h1>
            <p>متابعة منظمة لأخبار نقادة ومحافظة قنا من المصادر الصحفية والرسمية، ومعها الأخبار المحلية التي يكتبها فريق الدليل.</p>
            <div className={styles.heroStats}>
              <span><b>{feed.items.length.toLocaleString('ar-EG')}</b><small>خبرًا متاحًا الآن</small></span>
              <span><b>{sourceCount.toLocaleString('ar-EG')}</b><small>مصادر ظاهرة</small></span>
              <span><b>١٥</b><small>دقيقة بين التحديثات</small></span>
            </div>
          </div>
          <aside className={styles.livePanel} aria-label="حالة تغذية الأخبار">
            <div className={styles.livePanelHead}><span><i aria-hidden="true" /> البث يعمل</span><b>LIVE</b></div>
            <strong>نقادة أولًا، ثم قنا</strong>
            <p>فلترة تلقائية، إزالة للتكرار، وربط مباشر بالناشر.</p>
            <div className={styles.livePanelFoot}>
              <span>آخر فحص <time dateTime={feed.checkedAt}>{formatCheckedAt(feed.checkedAt)}</time></span>
              <span>{feed.successfulFeeds.toLocaleString('ar-EG')} من {feed.totalFeeds.toLocaleString('ar-EG')} قنوات متاحة</span>
            </div>
          </aside>
        </div>
      </section>

      <div className={`shell ${styles.newsroom}`}>
        <section className={styles.trustBar} aria-label="سياسة عرض الأخبار">
          <span className={styles.trustIcon} aria-hidden="true">✓</span>
          <div><strong>المصدر ظاهر قبل التفاصيل</strong><p>الأخبار الخارجية تحتفظ باسم ناشرها ورابطه، وما يكتبه فريق دليل نقادة يظهر باسمه بوضوح.</p></div>
          <a href="#news-sources">راجع المصادر <span aria-hidden="true">↓</span></a>
        </section>

        <nav className={styles.filters} aria-label="تصفية الأخبار">
          <span>اختر القسم</span>
          <div>
            {filters.map((filter) => (
              <Link
                key={filter.key}
                href={filter.key === 'الكل' ? '/news' : `/news?section=${encodeURIComponent(filter.key)}`}
                aria-current={selected === filter.key ? 'page' : undefined}
                scroll={false}
              >{filter.label}</Link>
            ))}
          </div>
        </nav>

        {featured ? (
          <>
            <section className={styles.leadSection} aria-labelledby="lead-story-title">
              <div className={styles.sectionTitle}><div><span>الأهم الآن</span><h2 id="lead-story-title">في صدارة المشهد المحلي</h2></div><small>{selected === 'الكل' ? 'مرتبة حسب الصلة والحداثة' : `قسم: ${selected}`}</small></div>
              <article className={styles.leadStory} id={`story-${featured.id}`}>
                <Link className={styles.leadMedia} href={`/news/${featured.id}`} tabIndex={-1} aria-hidden="true">
                  <NewsImage src={featured.imageUrl} alt={featured.imageAlt} priority sizes="(max-width: 820px) calc(100vw - 28px), 58vw" />
                  <span className={styles.imageCredit}>الصورة: {featured.source}</span>
                </Link>
                <div className={styles.leadCopy}>
                  <div className={styles.leadLabels}><span>{featured.category}</span>{featured.isNaqada ? <b>من نقادة</b> : <b>من قنا</b>}</div>
                  <StoryMeta item={featured} />
                  <h2><Link href={`/news/${featured.id}`}>{featured.title}</Link></h2>
                  {featured.description ? <p>{featured.description}</p> : <p className={styles.descriptionFallback}>يفتح الرابط التالي التفاصيل الكاملة كما نشرها المصدر.</p>}
                  <div className={styles.leadFooter}><SourceButton item={featured} /><span>{featured.isOriginal ? 'خبر محلي من الدليل' : `يفتح في موقع ${featured.source}`}</span></div>
                </div>
              </article>
            </section>

            {latest.length > 0 ? (
              <section className={styles.latestSection} aria-labelledby="latest-news-title">
                <div className={styles.sectionTitle}><div><span>آخر ما وصل</span><h2 id="latest-news-title">أحدث الأخبار من المصادر</h2></div><small>{latest.length.toLocaleString('ar-EG')} خبرًا في هذا العرض</small></div>
                <div className={styles.grid}>{latest.map((item) => <NewsCard item={item} key={item.id} />)}</div>
              </section>
            ) : null}
          </>
        ) : (
          <section className={styles.emptyState}>
            <span aria-hidden="true">ن</span>
            <div><strong>{feed.items.length ? 'لا توجد أخبار في هذا القسم الآن' : 'نجري الآن أول مزامنة للمصادر'}</strong><p>{feed.items.length ? 'اختر «كل الأخبار» أو قسمًا آخر لمشاهدة التغطية المتاحة.' : 'تظل روابط المصادر المباشرة أدناه متاحة، وستظهر العناوين تلقائيًا عند اكتمال الاتصال.'}</p></div>
            {feed.items.length ? <Link href="/news">عرض كل الأخبار</Link> : null}
          </section>
        )}

        <section className={styles.sources} id="news-sources" aria-labelledby="news-sources-title">
          <div className={styles.sectionTitle}><div><span>الشفافية أولًا</span><h2 id="news-sources-title">دليل المصادر</h2><p>روابط مباشرة إلى الجهات والمواقع التي نراجع منها أخبار نقادة وقنا. ظهور المصدر هنا لا يعني نقل كل محتواه أو اعتماده تحريرياً من دليل نقادة.</p></div></div>
          <div className={styles.sourceGrid}>
            {newsSourceDirectory.map((source, index) => (
              <a href={source.href} target="_blank" rel="noopener noreferrer external" key={source.name}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{source.name}</strong><small>{source.label}</small></div>
                <b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        </section>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
