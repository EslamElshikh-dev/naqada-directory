import '@/app/content-styles.css';
import { NUMBER_LOCALE } from '@/lib/format-number';
import type { Metadata } from 'next';
import { LocalityExplorer } from '@/components/locality-explorer';
import { UtilityPageHeader } from '@/components/utility-page-header';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { localitiesWithPublicCounts } from '@/lib/public-localities';
import { localities } from '@/lib/data';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'دليل قرى ونجوع نقادة | القرى والعزب والخدمات',
  description: 'دليل قرى ونجوع نقادة بمحافظة قنا: استكشف القرى والنجوع والعزب والمواضع الموثقة وافتح دليل كل قرية للوصول إلى الخدمات والأنشطة المسجلة فيها.',
  path: '/villages/',
});

export const revalidate = 60;

export default async function VillagesPage() {
  const catalog = await getPublicBusinessCatalog();
  const places = localitiesWithPublicCounts(localities, catalog.businesses);
  const kinds = new Set(localities.map((item) => item.type)).size;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل قرى ونجوع نقادة',
    url: `${siteConfig.url}/villages/`,
    inLanguage: 'ar-EG',
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: localities.length,
      itemListElement: localities.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `دليل ${item.name}`,
        url: `${siteConfig.url}/villages/${encodeURIComponent(item.slug)}/`,
      })),
    },
  };

  return (
    <main id="main-content" className="page-main">
      <UtilityPageHeader current="القرى والنجوع" eyebrow="مركز نقادة · محافظة قنا"
        title={<>دليل قرى ونجوع <em>نقادة</em></>}
        description="من دليل بشلاو ودليل الأوسط قمولا إلى بقية قرى نقادة؛ اختَر بلدك للوصول إلى خدماتها ومعلوماتها."
        metrics={[
          { value: places.length.toLocaleString(NUMBER_LOCALE), label: 'موضع' },
          { value: kinds.toLocaleString(NUMBER_LOCALE), label: 'أنواع جغرافية' },
          { value: catalog.businesses.length.toLocaleString(NUMBER_LOCALE), label: 'نشاط منشور' },
        ]} />
      <section id="places" className="shell page-section">
        <LocalityExplorer localities={places} />
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
