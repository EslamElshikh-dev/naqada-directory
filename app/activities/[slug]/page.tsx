import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryVisual } from '@/components/category-visual';
import { ListingCard } from '@/components/listing-card';
import { activityLandings, getActivityBySlug, getBusinessesForActivity } from '@/lib/activity-landings';
import { canonicalLocalityName, localities } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return activityLandings.map((activity) => ({ slug: activity.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const activity = getActivityBySlug(slug);
  if (!activity) return {};
  const count = getBusinessesForActivity(activity).length;
  return buildPageMetadata({
    title: activity.name,
    description: `${activity.description} تصفح ${count.toLocaleString('ar-EG')} اسمًا منشورًا في دليل نقادة.`,
    path: `/activities/${activity.slug}`,
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
  const pageUrl = `${siteConfig.url}/activities/${encodeURIComponent(activity.slug)}`;
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
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: scoped.length,
          itemListElement: scoped.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'الأنشطة', item: `${siteConfig.url}/activities` },
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
            <div className="hero-inline-stats"><span><b>{scoped.length.toLocaleString('ar-EG')}</b> اسمًا منشورًا</span><span><b>{places.length.toLocaleString('ar-EG')}</b> قرية أو نجعًا</span></div>
          </div>
          <CategoryVisual category={activity.visualCategory} size="lg" />
        </div>
      </section>

      <section className="shell page-section">
        {places.length > 0 && (
          <div className="category-pills" aria-label={`أماكن وجود ${activity.name}`}>
            {places.map(({ locality, count }) => <Link key={locality.slug} href={`/villages/${locality.slug}`}>{locality.name} <small>{count.toLocaleString('ar-EG')}</small></Link>)}
          </div>
        )}
        <div className="section-heading"><div><span className="eyebrow eyebrow--dark">الأسماء داخل الدليل</span><h2>نتائج {activity.name}</h2><p>اضغط على اسم النشاط لفتح صفحته المستقلة ومعرفة العنوان ووسيلة الاتصال ومصدر الوصول حسب المتاح.</p></div></div>
        <div className="listing-grid">{scoped.map((item) => <ListingCard key={item.id} listing={item} />)}</div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
