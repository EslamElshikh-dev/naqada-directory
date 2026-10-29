import '@/app/route-styles/activities.css';
import { NUMBER_LOCALE } from '@/lib/format-number';
import type { Metadata } from 'next';
import Link from 'next/link';
import { UtilityPageHeader } from '@/components/utility-page-header';
import { CategoryCover } from '@/components/category-cover';
import { activityLandings, getBusinessesForActivity } from '@/lib/activity-landings';
import { canonicalLocalityName } from '@/lib/data';
import { getActivityMedia } from '@/lib/category-media';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'دليل خدمات وأنشطة نقادة | صيدليات وأطباء ومدارس ومطاعم',
  description: 'دليل خدمات وأنشطة نقادة بمحافظة قنا: صيدليات وأطباء وعيادات ومدارس ومحلات ومطاعم وبنوك وخدمات أخرى، مع الأسماء والعناوين والهواتف ومناطق التواجد.',
  path: '/activities/',
});

export const revalidate = 3600;

export default async function ActivitiesPage() {
  const catalog = await getPublicBusinessCatalog();
  const totalBusinesses = new Set(activityLandings.flatMap((activity) => getBusinessesForActivity(activity, catalog.businesses).map((item) => item.id))).size;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل خدمات وأنشطة نقادة',
    url: `${siteConfig.url}/activities/`,
    inLanguage: 'ar-EG',
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: activityLandings.length,
      itemListElement: activityLandings.map((activity, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: activity.name,
        url: `${siteConfig.url}/activities/${encodeURIComponent(activity.slug)}/`,
      })),
    },
  };

  return (
    <main id="main-content" className="page-main">
      <UtilityPageHeader current="الخدمات والأنشطة" eyebrow="خدمات مركز نقادة"
        title={<>دليل خدمات وأنشطة <em>نقادة</em></>}
        description="صيدليات وأطباء ومدارس ومحلات؛ افتح الخدمة للاطلاع على الأنشطة وأرقامها ومواقعها المتاحة."
        metrics={[
          { value: activityLandings.length.toLocaleString(NUMBER_LOCALE), label: 'نوع خدمة' },
          { value: totalBusinesses.toLocaleString(NUMBER_LOCALE), label: 'نشاط مرتبط' },
        ]} />
      <section className="shell page-section">
        <div className="category-grid">
          {activityLandings.map((activity, index) => {
            const items = getBusinessesForActivity(activity, catalog.businesses);
            const localityCount = new Set(items.map((item) => canonicalLocalityName(item.locality))).size;
            return (
              <Link prefetch={false} key={activity.slug} href={`/activities/${activity.slug}`} className="category-card">
                <CategoryCover category={activity.visualCategory} index={index} media={getActivityMedia(activity)} />
                <h3>{activity.name}</h3>
                <p>{activity.description}</p>
                <div className="category-card__footer"><b>{items.length.toLocaleString(NUMBER_LOCALE)} اسمًا · {localityCount.toLocaleString(NUMBER_LOCALE)} موضعًا</b><span>عرض الأسماء ←</span></div>
              </Link>
            );
          })}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
