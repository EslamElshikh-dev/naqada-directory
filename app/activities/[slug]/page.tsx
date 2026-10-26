import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UtilityPageHeader } from '@/components/utility-page-header';
import { ListingCard } from '@/components/listing-card';
import { ServiceLocalityDiscovery } from '@/components/service-locality-discovery';
import { activityLandings, getActivityBySlug, getBusinessesForActivity } from '@/lib/activity-landings';
import { canonicalLocalityName, localities } from '@/lib/data';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { publicBusinessHref } from '@/lib/business-links';
import { localCategoryHref } from '@/lib/discovery-routing';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';

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
  const catalog = await getPublicBusinessCatalog();
  const count = getBusinessesForActivity(activity, catalog.businesses).length;
  return buildPageMetadata({
    title: `${activity.name}: الأسماء والعناوين`,
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
  const catalog = await getPublicBusinessCatalog();
  const scoped = getBusinessesForActivity(activity, catalog.businesses);
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
            url: `${siteConfig.url}${publicBusinessHref(item)}`,
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
      <UtilityPageHeader current={activity.name} parent={{ href: '/activities', label: 'الخدمات' }}
        title={activity.name} description={activity.description}
        metrics={[
          { value: scoped.length.toLocaleString('ar-EG'), label: 'نشاط منشور' },
          { value: places.length.toLocaleString('ar-EG'), label: 'قرية أو نجع' },
        ]} />
      <section className="shell page-section">
        <ServiceLocalityDiscovery compact
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
