import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryVisual } from '@/components/category-visual';
import { ListingCard } from '@/components/listing-card';
import { ServiceLocalityDiscovery } from '@/components/service-locality-discovery';
import { activityLandings, getActivityBySlug, getBusinessesForActivity } from '@/lib/activity-landings';
import { canonicalLocalityName, localities } from '@/lib/data';
import { localCategoryHref } from '@/lib/discovery-routing';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return activityLandings.map((activity) => ({ slug: activity.slug }));
}

function activityKeywords(name: string, searchLabel: string) {
  const core = name.replace(/\s+في\s+نقادة$/, ' نقادة');
  const singular = searchLabel.trim();
  return [...new Set([
    name,
    core,
    `${singular} نقادة`,
    `${singular} في نقادة`,
    `دليل ${name}`,
    `دليل ${core}`,
    `أفضل ${singular} في نقادة`,
    `خدمات ${singular} نقادة`,
    'دليل نقادة',
    'خدمات نقادة',
  ])];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const activity = getActivityBySlug(slug);
  if (!activity) return {};
  const count = getBusinessesForActivity(activity).length;
  return buildPageMetadata({
    title: `${activity.name} | الأسماء والعناوين في دليل نقادة`,
    description: `${activity.description} تصفح ${count.toLocaleString('ar-EG')} اسمًا منشورًا، وابحث حسب القرية أو النجع داخل مركز نقادة بمحافظة قنا.`,
    path: `/activities/${activity.slug}`,
    keywords: activityKeywords(activity.name, activity.searchLabel),
    robots: count >= 2 ? { index: true, follow: true } : { index: false, follow: true },
  });
}

export default async function ActivityPage({ params }: Props) {
  const { slug } = await params;
  const activity = getActivityBySlug(slug);
  if (!activity) notFound();
  const scoped = getBusinessesForActivity(activity);
  const localityCounts = new Map<string, number>();
  for (const item of scoped) {
    const name = canonicalLocalityName(item.locality);
    localityCounts.set(name, (localityCounts.get(name) || 0) + 1);
  }
  const places = [...localityCounts.entries()]
    .map(([name, count]) => ({ locality: localities.find((item) => item.name === name), count }))
    .filter((item): item is { locality: NonNullable<typeof item.locality>; count: number } => Boolean(item.locality))
    .sort((a, b) => b.count - a.count || a.locality.name.localeCompare(b.locality.name, 'ar'));
  const broadCategory = activity.categories?.[0] || null;
  const useBroadCategory = Boolean(broadCategory && activity.categories?.length === 1 && !activity.subcategories?.length);
  const localityDiscoveryItems = places.map(({ locality, count }) => ({
    name: locality.name,
    count,
    href: useBroadCategory && broadCategory
      ? localCategoryHref(broadCategory, locality.name)
      : `/directory?q=${encodeURIComponent(activity.searchLabel)}&locality=${encodeURIComponent(locality.name)}`,
  }));
  const pageUrl = `${siteConfig.url}/activities/${encodeURIComponent(activity.slug)}/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: activity.name,
        url: pageUrl,
        description: activity.description,
        inLanguage: 'ar-EG',
        about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر' },
        keywords: activityKeywords(activity.name, activity.searchLabel).join(', '),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: scoped.length,
          itemListElement: scoped.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}/`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: `${siteConfig.url}/` },
          { '@type': 'ListItem', position: 2, name: 'الأنشطة', item: `${siteConfig.url}/activities/` },
          { '@type': 'ListItem', position: 3, name: activity.name, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="detail-hero category-hero">
        <div className="shell category-hero__grid">
          <div>
            <nav className="breadcrumbs"><Link href="/activities">الأنشطة</Link><span>/</span><span>{activity.name}</span></nav>
            <span className="eyebrow">دليل محلي متخصص · مركز نقادة</span>
            <h1>{activity.name}</h1>
            <p>{activity.description}</p>
            <p>هذه الصفحة مخصصة للبحث عن <strong>{activity.name}</strong> داخل مدينة نقادة وقرى ونجوع مركز نقادة، وتجمع الأسماء المنشورة في الدليل في صفحة واحدة بدل البحث المتفرق.</p>
            <div className="hero-inline-stats"><span><b>{scoped.length.toLocaleString('ar-EG')}</b> اسمًا منشورًا</span><span><b>{places.length.toLocaleString('ar-EG')}</b> قرية أو نجعًا</span></div>
          </div>
          <CategoryVisual category={activity.visualCategory} size="lg" />
        </div>
      </section>

      <section className="shell page-section">
        <ServiceLocalityDiscovery
          eyebrow="ابحث حسب المكان"
          title={`${activity.name} في قرى ونجوع نقادة`}
          description={`اختر المكان للوصول مباشرة إلى نتائج ${activity.searchLabel} المنشورة داخله، بدون المرور بصفحة القرية العامة أولًا.`}
          items={localityDiscoveryItems}
          resultsHref="#activity-results"
        />
        <div id="activity-results">
          <div className="section-heading"><div><span className="eyebrow eyebrow--dark">الأسماء داخل الدليل</span><h2>دليل {activity.name}: الأسماء والعناوين</h2><p>اضغط على اسم النشاط لفتح صفحته المستقلة ومعرفة العنوان ووسيلة الاتصال ومصدر الوصول حسب المتاح.</p></div></div>
          <div className="listing-grid">{scoped.map((item) => <ListingCard key={item.id} listing={item} />)}</div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
