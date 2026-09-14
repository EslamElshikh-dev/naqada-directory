import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ActionIcon } from '@/components/action-icon';
import { CategoryVisual } from '@/components/category-visual';
import { HomeSmartSearch } from '@/components/home-smart-search';
import { SiteReviews } from '@/components/site-reviews';
import { BrandMark } from '@/components/site-shell';
import { activityLandings, getBusinessesForActivity } from '@/lib/activity-landings';
import { businesses, localities, meta, officialLocalities } from '@/lib/data';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { getCategoryMedia } from '@/lib/category-media';
import { knowledgeHeritage, knowledgePeople, knowledgePlaces, primaryKnowledgeContributor } from '@/lib/knowledge';
import { siteConfig } from '@/lib/site';
import { villageArticleAuthor } from '@/lib/village-articles';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

const priorityLocalityNames = ['بشلاو', 'الأوسط قمولا', 'طوخ', 'الخطارة', 'دنفيق'];
const priorityActivityNames = ['صيدليات نقادة', 'أطباء وعيادات نقادة', 'مدارس ومعاهد نقادة', 'مطاعم ومقاهي نقادة', 'محلات وأسواق نقادة'];
const faq = [
  { question: 'ما الذي أستطيع البحث عنه؟', answer: 'خدمات وأنشطة محلية، قرى ونجوع، أشخاص ومعالم وموضوعات من موسوعة نقادة.' },
  { question: 'هل كل نشاط ظاهر معتمد رسميًا؟', answer: 'لا. الدليل منصة معلوماتية مستقلة، ويعرض مصدر البيانات وتاريخ المراجعة بقدر ما تسمح به المادة المتاحة.' },
  { question: 'كيف تُراجع المعلومات المحلية؟', answer: 'تُربط البيانات بمصدرها، وتُعرض حدود المعلومة بوضوح، ويمكن لأهل نقادة إرسال تصحيح للمراجعة.' },
  { question: 'هل تغطي الموسوعة كل قرى نقادة؟', answer: 'يشمل الهيكل المواضع الموثقة، وتُضاف التفاصيل والخدمات تدريجيًا كلما اكتملت مراجعتها.' },
];

export default function HomePage() {
  const topLocalities = officialLocalities.filter((item) => item.businessCount > 0).slice(0, 10);
  const priorityLocalities = priorityLocalityNames
    .map((name) => localities.find((item) => item.name === name))
    .filter((item): item is (typeof localities)[number] => Boolean(item));
  const featuredLocalityGuides = [
    ...priorityLocalities,
    ...topLocalities.filter((item) => !priorityLocalityNames.includes(item.name)),
  ].slice(0, 5);
  const priorityActivities = priorityActivityNames
    .map((name) => activityLandings.find((item) => item.name === name))
    .filter((item): item is (typeof activityLandings)[number] => Boolean(item));
  const featuredActivities = [
    ...priorityActivities,
    ...activityLandings.filter((item) => !priorityActivityNames.includes(item.name)),
  ].slice(0, 6);
  const recentlyReviewed = [...businesses]
    .filter((item) => Boolean(item.checked))
    .sort((a, b) => (b.checked || '').localeCompare(a.checked || '') || (b.reviews || 0) - (a.reviews || 0))
    .slice(0, 3);
  const featuredArticles = allEditorialPosts.slice(0, 4);
  const leadArticle = featuredArticles[0];
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل وموسوعة مركز نقادة',
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    dateModified: meta.updatedAt,
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر', address: { '@type': 'PostalAddress', addressRegion: 'قنا', addressCountry: 'EG' } },
    contributor: { '@type': 'Person', name: primaryKnowledgeContributor.name, url: `${siteConfig.url}/contributors/${primaryKnowledgeContributor.slug}` },
  };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) };

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMesh} aria-hidden="true" />
        <div className={`shell ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <div className={styles.heroMetaLine}>
              <span className={styles.liveBadge}><i /> دليل محلي متجدد باستمرار</span>
              <span className={styles.location}>مركز نقادة · محافظة قنا</span>
            </div>
            <span className={styles.heroEyebrow}>الموسوعة المحلية لمركز نقادة وقراه</span>
            <h1>دليل نقادة المحلي… <em>خدمتك وقريتك</em> في بحث واحد.</h1>
            <p>ابحث عن الأطباء والصيدليات والمدارس والمحلات والخدمات داخل مركز نقادة، وافتح دليل قريتك أو حكايات المكان من نقطة واحدة واضحة وسريعة.</p>
            <div className={styles.searchWrap}><HomeSmartSearch compact /></div>
            <nav className={styles.quickLinks} aria-label="وصول سريع">
              <span>وصول سريع</span>
              {featuredActivities.slice(0, 4).map((activity) => <Link key={activity.slug} href={`/activities/${activity.slug}`}>{activity.searchLabel}</Link>)}
              <Link href="/villages">القرى</Link>
              <Link href="/knowledge">الموسوعة</Link>
            </nav>
            <div className={styles.trust} aria-label="إحصاءات الدليل">
              <span><b>{meta.businessCount.toLocaleString('ar-EG')}</b><small>خدمة ونشاط</small></span>
              <span><b>{meta.localityCount.toLocaleString('ar-EG')}</b><small>قرية وموضعًا</small></span>
              <span><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString('ar-EG')}</b><small>علمًا ومعلمًا</small></span>
            </div>
          </div>

          <aside className={styles.placeCard} aria-label="مشهد تعبيري من مركز نقادة">
            <Image
              src="/blog-media/bashlaw-today-hero.jpg"
              alt="مشهد تعبيري من البيئة الريفية في مركز نقادة بمحافظة قنا"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 420px"
            />
            <span className={styles.placeShade} aria-hidden="true" />
            <div className={styles.placeTop}>
              <span className={styles.placeBrand}><BrandMark /></span>
              <span>صورة تعبيرية محلية</span>
            </div>
            <div className={styles.placeCaption}>
              <span>مركز نقادة · محافظة قنا</span>
              <strong>الأرض والقرى والخدمات في دليل واحد</strong>
              <Link href="/villages">استكشف قرى نقادة <b aria-hidden="true">←</b></Link>
            </div>
          </aside>
        </div>
      </section>

      <section className={`shell ${styles.section}`}>
        <header className={styles.sectionHead}>
          <div><span>أقسام الدليل</span><h2>ابدأ بنوع الخدمة التي تحتاج إليها</h2><p>صيدليات وأطباء ومدارس ومطاعم ومحلات في نقادة، داخل أقسام مصوّرة ومرتبة للوصول بأقل عدد من الخطوات.</p></div>
          <Link href="/activities">كل الخدمات <ActionIcon name="arrow" /></Link>
        </header>
        <div className={styles.serviceGrid}>
          {featuredActivities.map((activity) => {
            const count = getBusinessesForActivity(activity).length;
            const media = getCategoryMedia(activity.visualCategory);
            return (
              <Link key={activity.slug} href={`/activities/${activity.slug}`} className={styles.serviceItem}>
                <span className={styles.serviceMedia}>
                  <Image src={media.imageUrl} alt={media.imageAlt} fill sizes="(max-width: 720px) 112px, 33vw" />
                  <i aria-hidden="true" />
                  <CategoryVisual category={activity.visualCategory} size="sm" />
                </span>
                <span className={styles.serviceCount}>{count.toLocaleString('ar-EG')} نتيجة</span>
                <h3>{activity.name}</h3>
                <p>{activity.description}</p>
                <span className={styles.serviceArrow}>استكشف القسم <ActionIcon name="arrow" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.discoveryBand}>
        <div className={`shell ${styles.discoveryGrid}`}>
          <article className={styles.placesPanel}>
            <header><span>ابدأ من مكانك</span><h2>قرى نقادة ونجوعها</h2><p>اختر القرية لتجد خدماتها وملفها المحلي في صفحة واحدة.</p></header>
            <div className={styles.placeList}>
              {featuredLocalityGuides.map((item, index) => (
                <Link key={item.slug} href={`/villages/${item.slug}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>دليل {item.name}</strong><small>{item.type}</small></div>
                  <b>{item.businessCount.toLocaleString('ar-EG')}</b>
                </Link>
              ))}
            </div>
            <Link href="/villages" className={styles.panelLink}>عرض خريطة الأماكن <ActionIcon name="arrow" /></Link>
          </article>

          <article className={styles.knowledgePanel}>
            <header><span>موسوعة نقادة</span><h2>اعرف المكان من مصادره</h2><p>مواد منظمة عن الجغرافيا والأعلام والتراث، مع إسناد واضح لكل مادة.</p></header>
            <div className={styles.knowledgeTopics}>
              <Link href="/knowledge/places"><span>الأماكن</span><strong>{knowledgePlaces.length.toLocaleString('ar-EG')}</strong><small>موضعًا</small></Link>
              <Link href="/knowledge/people"><span>الأعلام</span><strong>{knowledgePeople.length.toLocaleString('ar-EG')}</strong><small>شخصية</small></Link>
              <Link href="/knowledge/heritage"><span>التراث</span><strong>{knowledgeHeritage.length.toLocaleString('ar-EG')}</strong><small>موضوعًا</small></Link>
            </div>
            <div className={styles.attribution}><b>أد</b><p>بمساهمة <strong>{primaryKnowledgeContributor.name}</strong><small>{primaryKnowledgeContributor.role}</small></p></div>
            <Link href="/knowledge" className={styles.panelLink}>تصفّح الموسوعة <ActionIcon name="arrow" /></Link>
          </article>
        </div>
      </section>

      {leadArticle ? (
        <section className={`shell ${styles.section} ${styles.stories}`}>
          <header className={styles.sectionHead}>
            <div><span>من داخل المكان</span><h2>حكايات تستحق أن تُقرأ</h2><p>مقالات محلية مصوّرة عن الحياة والذاكرة والناس في نقادة.</p></div>
            <Link href="/blog">كل الحكايات <ActionIcon name="arrow" /></Link>
          </header>
          <div className={styles.storyGrid}>
            <Link href={`/blog/${leadArticle.slug}`} className={styles.leadStory}>
              <Image src={`/blog-media/${encodeURIComponent(leadArticle.hero.asset)}`} width={leadArticle.hero.width} height={leadArticle.hero.height} alt={leadArticle.hero.alt} sizes="(max-width: 760px) calc(100vw - 32px), 58vw" />
              <div><span>{leadArticle.category} · {leadArticle.locality}</span><h3>{leadArticle.title}</h3><p>{leadArticle.description}</p><b>اقرأ الحكاية <ActionIcon name="arrow" /></b></div>
            </Link>
            <div className={styles.storyList}>
              {featuredArticles.slice(1).map((article, index) => (
                <Link key={article.slug} href={`/blog/${article.slug}`}>
                  <span className={styles.storyThumb}>
                    <Image
                      src={`/blog-media/${encodeURIComponent(article.hero.asset)}`}
                      width={article.hero.width}
                      height={article.hero.height}
                      alt=""
                      sizes="(max-width: 720px) 92px, 116px"
                    />
                    <b>0{index + 2}</b>
                  </span>
                  <div><small>{article.locality} · {article.category}</small><h3>{article.title}</h3><b>بقلم {villageArticleAuthor.name}</b></div>
                  <ActionIcon name="arrow" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.updateBand}>
        <div className={`shell ${styles.updates}`}>
          <header><span>الدليل يتجدد</span><h2>معلومات راجعناها مؤخرًا</h2><Link href="/updates">سجل التحديثات <ActionIcon name="arrow" /></Link></header>
          <div>
            {recentlyReviewed.map((item) => (
              <Link key={item.id} href={`/listing/${item.slug}`}>
                <span><strong>{item.name}</strong><small>{item.category} · {item.locality}</small></span>
                <time dateTime={item.checked || undefined}>{item.checked}</time>
                <ActionIcon name="arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={`shell ${styles.community}`}>
        <div><span>دليل يبنيه أهله</span><h2>وجدت معلومة ناقصة أو قديمة؟</h2><p>أرسل التصحيح مع مصدره، وسنراجعه قبل النشر.</p></div>
        <Link href="/contribute"><ActionIcon name="add" /> أضف أو صحّح بيانات</Link>
      </section>

      <section className={`shell ${styles.faq}`}>
        <header className={styles.sectionHead}><div><span>قبل أن تبدأ</span><h2>أسئلة قصيرة وإجابات واضحة</h2></div></header>
        <div>{faq.map((item) => <details key={item.question}><summary>{item.question}<ActionIcon name="chevron" /></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <details className={styles.reviewReveal}>
        <summary><span><small>مساحة المجتمع</small><strong>شاركنا رأيك في الدليل</strong></span><b>فتح التقييمات</b></summary>
        <SiteReviews />
      </details>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}
