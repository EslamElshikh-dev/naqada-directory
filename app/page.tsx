import '@/app/route-styles/home.css';
import { NUMBER_LOCALE } from '@/lib/format-number';
import type { Metadata } from 'next';
import { cache, Suspense, type CSSProperties, type ReactNode } from 'react';
import { NavigationIcon, type NavigationIconName } from '@/components/navigation-icon';
import Image from 'next/image';
import Link from 'next/link';
import { ActionIcon } from '@/components/action-icon';
import { CategoryVisual } from '@/components/category-visual';
import { HomeSmartSearch } from '@/components/home-smart-search';
import { DeferredSiteReviews as SiteReviews } from '@/components/deferred-site-reviews';
import { BrandMark } from '@/components/site-shell';
import { RoleModelFeature } from '@/components/role-model-feature';
import { activityLandings, getBusinessesForActivity } from '@/lib/activity-landings';
import { localities, meta, officialLocalities } from '@/lib/data';
import { getPublicEditorialPosts, getPublicRoleModels } from '@/lib/article-content';
import { editorialImagePath } from '@/lib/editorial-image-path';
import { getActivityMedia } from '@/lib/category-media';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { publicBusinessHref } from '@/lib/business-links';
import { localitiesWithPublicCounts } from '@/lib/public-localities';
import { PublicBusinessCount } from '@/components/public-business-count';
import { knowledgeHeritage, knowledgePeople, knowledgePlaces, primaryKnowledgeContributor } from '@/lib/knowledge';
import { absoluteUrl, siteConfig } from '@/lib/site';
import { priorityActivityNames, priorityLocalityNames } from '@/lib/seo-priorities';
import { villageArticleAuthor } from '@/lib/village-articles';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  description: siteConfig.description,
  alternates: { canonical: '/' },
  other: { 'naqada-public-snapshot': 'anonymous' },
};

const serviceToneByCategory: Record<string, string> = {
  'الطب والصحة': 'health',
  'التعليم': 'learning',
  'المطاعم والأطعمة': 'food',
  'التجزئة والتسوق': 'retail',
  'دور العبادة': 'faith',
  'البناء والصيانة': 'craft',
  'السيارات والنقل': 'transport',
  'الإلكترونيات والهواتف': 'tech',
  'الخدمات المهنية': 'professional',
  'الخدمات الحكومية': 'civic',
  'الجمعيات والمجتمع': 'community',
};
const homeRoutes: { href: string; title: string; description: string; icon: NavigationIconName }[] = [
  { href: '/directory', title: 'خدمة', description: 'الخدمات والأنشطة', icon: 'services' },
  { href: '/jobs', title: 'وظيفة', description: 'فرص العمل', icon: 'jobs' },
  { href: '/news', title: 'خبر', description: 'الأخبار المحلية', icon: 'news' },
  { href: '/villages', title: 'قرية', description: 'القرى والنجوع', icon: 'villages' },
];
const faq = [
  { question: 'إيه هو دليل نقادة؟', answer: 'دليل نقادة مشروع خدمي مستقل ومجاني لمركز نقادة بمحافظة قنا. يجمع الخدمات والأنشطة والقرى والنجوع، ويعرّف بأهل نقادة ومعالمها وحكاياتها، مع مصادر المعلومات ووسيلة لإرسال التصحيحات.' },
  { question: 'كل نشاط في الدليل معتمد رسميًا؟', answer: 'لا. الدليل منصة معلوماتية مستقلة، ويعرض مصدر البيانات وتاريخ المراجعة بقدر ما تسمح به المادة المتاحة.' },
  { question: 'بتراجعوا المعلومات كيف؟', answer: 'تُربط البيانات بمصدرها، وتُعرض حدود المعلومة بوضوح، ويمكن لأهل نقادة إرسال تصحيح للمراجعة.' },
  { question: 'الموسوعة فيها كل قرى نقادة؟', answer: 'يشمل الهيكل المواضع الموثقة، وتُضاف التفاصيل والخدمات تدريجيًا كلما اكتملت مراجعتها.' },
];

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const priorityActivities = priorityActivityNames
    .map((name) => activityLandings.find((item) => item.name === name))
    .filter((item): item is (typeof activityLandings)[number] => Boolean(item));
  const featuredActivities = [
    ...priorityActivities,
    ...activityLandings.filter((item) => !priorityActivityNames.includes(item.name)),
  ].slice(0, 6);
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: siteConfig.shortName,
    description: siteConfig.description,
    url: absoluteUrl('/'),
    inLanguage: 'ar-EG',
    isPartOf: { '@id': absoluteUrl('/') + '#website' },
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر', address: { '@type': 'PostalAddress', addressRegion: 'قنا', addressCountry: 'EG' } },
    contributor: { '@type': 'Person', name: primaryKnowledgeContributor.name, url: absoluteUrl(`/contributors/${primaryKnowledgeContributor.slug}`) },
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
            <span className={styles.heroEyebrow}>من أهل البلد، لأهل البلد</span>
            <h1>محتاج إيه <em>في نقادة؟</em></h1>
            <p>دوّر على خدمة، شوف فرصة شغل، أو اعرف أخبار بلدك وحكاياتها.</p>
            <div className={styles.searchWrap}><HomeSmartSearch compact /></div>
            <nav className={styles.quickLinks} aria-label="وصول سريع">
              <span>على طول</span>
              {featuredActivities.slice(0, 3).map((activity) => <Link prefetch={false} key={activity.slug} href={`/activities/${activity.slug}`}>{activity.searchLabel}</Link>)}
            </nav>
      <nav className={styles.routeRibbon} aria-label="اختار مشوارك في دليل نقادة">
        {homeRoutes.map((route, index) => (
          <Link key={route.href} href={route.href} prefetch={false} className={styles.routeCard} style={{ '--route-delay': `${index * 65}ms` } as CSSProperties}>
            <span className={styles.routeIcon}><NavigationIcon name={route.icon} /></span>
            <span className={styles.routeCopy}><strong>{route.title}</strong><small>{route.description}</small></span>
            <ActionIcon name="arrow" />
          </Link>
        ))}
      </nav>

            <div className={styles.trust} aria-label="إحصاءات الدليل">
              <span><b><Suspense fallback="…"><PublicBusinessCount /></Suspense></b><small>خدمة ونشاط</small></span>
              <span><b>{meta.localityCount.toLocaleString(NUMBER_LOCALE)}</b><small>قرية وموضعًا</small></span>
              <span><b>{(meta.peopleCount + meta.landmarkCount).toLocaleString(NUMBER_LOCALE)}</b><small>علمًا ومعلمًا</small></span>
            </div>
          </div>

          <aside className={styles.placeCard} aria-label="مشهد تعبيري من مركز نقادة">
            <Image
              src="/images/naqada-home.jpg"
              alt="مشهد تعبيري من البيئة الريفية في مركز نقادة بمحافظة قنا"
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 40vw, 480px"
            />
            <span className={styles.placeShade} aria-hidden="true" />
            <div className={styles.placeTop}>
              <span className={styles.placeBrand}><BrandMark /></span>
              <span>صورة تعبيرية محلية</span>
            </div>
            <div className={styles.placeCaption}>
              <span>مركز نقادة · محافظة قنا</span>
              <strong>بلدنا… ونعرفها زين.</strong>
              <Link prefetch={false} href="/villages">خد لك لفّة في القرى <b aria-hidden="true">←</b></Link>
            </div>
          </aside>
        </div>

      </section>

      <section className={`shell ${styles.section}`} id="home-services">
        <header className={styles.sectionHead}>
          <div><span>قريب منك</span><h2>مشوارك على فين النهارده؟</h2><p>صيدليات وأطباء ومدارس ومطاعم ومحلات في نقادة. اختار طلبك، وسيب اللفّة علينا.</p></div>
          <Link prefetch={false} href="/activities">كل الخدمات <ActionIcon name="arrow" /></Link>
        </header>
        <Suspense fallback={<HomeSectionStatus>جارٍ تجهيز الخدمات…</HomeSectionStatus>}><HomeServiceGrid activities={featuredActivities} /></Suspense>
      </section>

      <section className={styles.discoveryBand}>
        <div className={`shell ${styles.discoveryGrid}`}>
          <article className={styles.placesPanel}>
            <header><span>ابدأ من مكانك</span><h2>قرى نقادة ونجوعها</h2><p>اختار بلدك، تلاقي خدماتها ومعلوماتها قدامك في صفحة واحدة.</p></header>
            <Suspense fallback={<p className={styles.contentStatus}>جارٍ تجهيز خدمات القرى…</p>}><HomePlaces /></Suspense>
            <Link prefetch={false} href="/villages" className={styles.panelLink}>كل القرى والنجوع <ActionIcon name="arrow" /></Link>
          </article>

          <article className={styles.knowledgePanel}>
            <header><span>موسوعة نقادة</span><h2>اعرف بلدك زين</h2><p>أماكن وناس وتراث من بلدنا، وكل معلومة معاها مصدرها. عشان الحكاية تبقى على بيّنة.</p></header>
            <div className={styles.knowledgeTopics}>
              <Link prefetch={false} href="/knowledge/places"><span>الأماكن</span><strong>{knowledgePlaces.length.toLocaleString(NUMBER_LOCALE)}</strong><small>موضعًا</small></Link>
              <Link prefetch={false} href="/knowledge/people"><span>الأعلام</span><strong>{knowledgePeople.length.toLocaleString(NUMBER_LOCALE)}</strong><small>شخصية</small></Link>
              <Link prefetch={false} href="/knowledge/heritage"><span>التراث</span><strong>{knowledgeHeritage.length.toLocaleString(NUMBER_LOCALE)}</strong><small>موضوعًا</small></Link>
            </div>
            <div className={styles.attribution}><b>أد</b><p>بمساهمة <strong>{primaryKnowledgeContributor.name}</strong><small>{primaryKnowledgeContributor.role}</small></p></div>
            <Link prefetch={false} href="/knowledge" className={styles.panelLink}>تصفّح الموسوعة <ActionIcon name="arrow" /></Link>
          </article>
        </div>
      </section>

      <Suspense fallback={<HomeSectionStatus>جارٍ تحميل حكايات البلد…</HomeSectionStatus>}><HomeEditorial /></Suspense>

      <Suspense fallback={null}><HomeRecent /></Suspense>

      <section className={`shell ${styles.community}`}>
        <div><span>دليل يبنيه أهله</span><h2>لقيت معلومة ناقصة؟ قول لنا.</h2><p>عينك معانا. ابعت التصحيح ومصدره، وإحنا نراجعه قبل ما ينزل.</p></div>
        <Link prefetch={false} href="/contribute"><ActionIcon name="add" /> أضف نشاطك</Link>
      </section>

      <section className={`shell ${styles.faq}`}>
        <header className={styles.sectionHead}><div><span>لو لسه بتسأل</span><h2>سؤالك عندنا وجوابه معاه</h2></div></header>
        <div>{faq.map((item) => <details key={item.question}><summary>{item.question}<ActionIcon name="chevron" /></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <SiteReviews />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}

// This request-only fallback never fills the shared cache with unmoderated static rows.
const getHomeCatalog = cache(async () => {
  try { return await getPublicBusinessCatalog(); }
  catch { console.error('HOME_PUBLIC_CATALOG_UNAVAILABLE'); return null; }
});

function HomeSectionStatus({ children }: { children: ReactNode }) {
  return <div className={`shell ${styles.contentStatus}`} role="status">{children}</div>;
}

async function HomeServiceGrid({ activities: featuredActivities }: { activities: typeof activityLandings }) {
  const catalog = await getHomeCatalog();
  return (
        <div className={styles.serviceGrid}>
          {featuredActivities.map((activity, index) => {
            const count = catalog ? getBusinessesForActivity(activity, catalog.businesses).length : null;
            const media = getActivityMedia(activity);
            return (
              <Link
                key={activity.slug}
                prefetch={false}
                href={`/activities/${activity.slug}`}
                className={styles.serviceItem}
                data-index={String(index + 1).padStart(2, '0')}
                data-tone={serviceToneByCategory[activity.visualCategory] || 'local'}
              >
                <span className={styles.serviceMedia}>
                  <Image src={media.imageUrl} alt={media.imageAlt} fill sizes="(max-width: 540px) calc((100vw - 52px) / 2), (max-width: 1000px) 30vw, 190px" />
                  <i aria-hidden="true" />
                  <CategoryVisual category={activity.visualCategory} size="sm" />
                </span>
                <span className={styles.serviceCount}>{count === null ? 'عرض الأنشطة' : `${count.toLocaleString(NUMBER_LOCALE)} نتيجة`}</span>
                <h3>{activity.name}</h3>
                <span className={styles.serviceArrow}>شوف الموجود <ActionIcon name="arrow" /></span>
              </Link>
            );
          })}
        </div>
  );
}

async function HomePlaces() {
  const catalog = await getHomeCatalog();
  const places = catalog ? localitiesWithPublicCounts(localities, catalog.businesses) : localities;
  const official = new Set(officialLocalities.map(item => item.name));
  const topLocalities = places.filter(item => official.has(item.name) && item.businessCount > 0).slice(0, 10);
  const priorityLocalities = priorityLocalityNames.map(name => places.find(item => item.name === name)).filter((item): item is typeof places[number] => Boolean(item));
  const featuredLocalityGuides = [...priorityLocalities, ...topLocalities.filter(item => !priorityLocalityNames.includes(item.name))].slice(0, 5);
  return (
            <div className={styles.placeList}>
              {featuredLocalityGuides.map((item, index) => (
                <Link prefetch={false} key={item.slug} href={`/villages/${item.slug}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>دليل {item.name}</strong><small>{item.type}</small></div>
                  <b>{catalog ? item.businessCount.toLocaleString(NUMBER_LOCALE) : '←'}</b>
                </Link>
              ))}
            </div>
  );
}

async function HomeEditorial() {
  const [posts, people] = await Promise.allSettled([getPublicEditorialPosts(), getPublicRoleModels()]);
  const roleModels = people.status === 'fulfilled' ? people.value : [];
  const allEditorialPosts = posts.status === 'fulfilled' ? posts.value : [];
  const featuredArticles = allEditorialPosts.slice(0, 4);
  const leadArticle = featuredArticles[0];
  if (posts.status === 'rejected' || people.status === 'rejected') console.error('HOME_EDITORIAL_CONTENT_UNAVAILABLE');
  return <>
    {posts.status === 'rejected' || people.status === 'rejected' ? <HomeSectionStatus>بعض حكايات البلد غير متاحة مؤقتًا. <Link href="/blog">تصفّح الحكايات</Link></HomeSectionStatus> : null}
      <RoleModelFeature people={roleModels.map((person) => ({
        slug: person.slug,
        name: person.name,
        locality: person.locality,
        shortTitle: person.shortTitle,
        photo: person.photos[person.cardPhotoIndex ?? 0],
      }))} />

      {leadArticle ? (
        <section className={`shell ${styles.section} ${styles.stories}`}>
          <header className={styles.sectionHead}>
            <div><span>من داخل المكان</span><h2>حكاوي بلدنا تحلّي القعدة</h2><p>هات كوباية الشاي، واقرأ عن ناس نقادة وبلادها وحكاياتها.</p></div>
            <Link prefetch={false} href="/blog">كل الحكايات <ActionIcon name="arrow" /></Link>
          </header>
          <div className={styles.storyGrid}>
            <Link prefetch={false} href={`/blog/${leadArticle.slug}`} className={styles.leadStory}>
              <Image unoptimized={leadArticle.hero.asset.startsWith('/api/article-media/')} src={editorialImagePath(leadArticle.hero.asset)} width={leadArticle.hero.width} height={leadArticle.hero.height} alt={leadArticle.hero.alt} sizes="(max-width: 760px) calc(100vw - 32px), 58vw" />
              <div><span>{leadArticle.category} · {leadArticle.locality}</span><h3>{leadArticle.title}</h3><p>{leadArticle.description}</p><b>اقرأ الحكاية <ActionIcon name="arrow" /></b></div>
            </Link>
            <div className={styles.storyList}>
              {featuredArticles.slice(1).map((article, index) => (
                <Link prefetch={false} key={article.slug} href={`/blog/${article.slug}`}>
                  <span className={styles.storyThumb}>
                    <Image
                      src={editorialImagePath(article.hero.asset)}
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

  </>;
}

async function HomeRecent() {
  const catalog = await getHomeCatalog();
  if (!catalog) return null;
  const recentlyReviewed = [...catalog.businesses].filter(item => Boolean(item.checked)).sort((a, b) => (b.checked || '').localeCompare(a.checked || '') || (b.reviews || 0) - (a.reviews || 0)).slice(0, 3);
  return (
      <section className={styles.updateBand}>
        <div className={`shell ${styles.updates}`}>
          <header><span>الدليل يتجدد</span><h2>معلومات راجعناها مؤخرًا</h2><Link prefetch={false} href="/updates">سجل التحديثات <ActionIcon name="arrow" /></Link></header>
          <div>
            {recentlyReviewed.map((item) => (
              <Link prefetch={false} key={item.id} href={publicBusinessHref(item)}>
                <span><strong>{item.name}</strong><small>{item.category} · {item.locality}</small></span>
                <time dateTime={item.checked || undefined}>{item.checked}</time>
                <ActionIcon name="arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

  );
}
