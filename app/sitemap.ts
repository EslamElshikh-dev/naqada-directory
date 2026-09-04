import type { MetadataRoute } from 'next';
import { businesses, canonicalLocalityName, categories, localities } from '@/lib/data';
import { siteConfig } from '@/lib/site';
import { getVillageArticle } from '@/lib/village-articles';

export const dynamic = 'force-static';

const fallbackDate = new Date('2026-09-04T00:00:00.000Z');

function latestDate(items: Array<{ checked: string | null }>) {
  const timestamps = items
    .map((item) => item.checked ? Date.parse(item.checked) : Number.NaN)
    .filter((value) => Number.isFinite(value));
  return timestamps.length ? new Date(Math.max(...timestamps)) : fallbackDate;
}

function sitemapUrl(path = '') {
  return path ? `${siteConfig.url}${path}/` : `${siteConfig.url}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const latestBusinessDate = latestDate(businesses);
  const baseRoutes: Array<{ path: string; lastModified?: Date }> = [
    { path: '', lastModified: latestBusinessDate },
    { path: '/directory', lastModified: latestBusinessDate },
    { path: '/blog', lastModified: fallbackDate },
    { path: '/villages', lastModified: fallbackDate },
    { path: '/families' },
    { path: '/heritage' },
    { path: '/updates', lastModified: latestBusinessDate },
    { path: '/coverage', lastModified: latestBusinessDate },
    { path: '/emergency' },
    { path: '/about' },
    { path: '/privacy' },
  ];
  const indexableLocalities = localities.filter((item) => item.businessCount > 0 || Boolean(getVillageArticle(item.name)));
  const comboCounts = new Map<string, { localitySlug: string; categorySlug: string; count: number; lastModified: Date }>();

  for (const business of businesses) {
    const locality = localities.find((item) => item.name === canonicalLocalityName(business.locality));
    const category = categories.find((item) => item.name === business.category);
    if (!locality || !category) continue;
    const key = `${locality.slug}::${category.slug}`;
    const current = comboCounts.get(key);
    const businessDate = business.checked ? new Date(business.checked) : fallbackDate;
    comboCounts.set(key, {
      localitySlug: locality.slug,
      categorySlug: category.slug,
      count: (current?.count || 0) + 1,
      lastModified: current && current.lastModified > businessDate ? current.lastModified : businessDate,
    });
  }

  const localCategoryPages = [...comboCounts.values()].filter((item) => item.count >= 3);

  return [
    ...baseRoutes.map(({ path, lastModified }) => ({
      url: sitemapUrl(path),
      ...(lastModified ? { lastModified } : {}),
    })),
    ...categories.map((item) => ({
      url: sitemapUrl(`/directory/${encodeURIComponent(item.slug)}`),
      lastModified: latestDate(businesses.filter((business) => business.category === item.name)),
    })),
    ...indexableLocalities.map((item) => {
      const article = getVillageArticle(item.name);
      return {
        url: sitemapUrl(`/villages/${encodeURIComponent(item.slug)}`),
        lastModified: article ? new Date(article.modifiedAt) : latestDate(businesses.filter((business) => canonicalLocalityName(business.locality) === item.name)),
      };
    }),
    ...localCategoryPages.map((item) => ({
      url: sitemapUrl(`/villages/${encodeURIComponent(item.localitySlug)}/${encodeURIComponent(item.categorySlug)}`),
      lastModified: item.lastModified,
    })),
    ...businesses.map((item) => ({
      url: sitemapUrl(`/listing/${encodeURIComponent(item.slug)}`),
      lastModified: item.checked ? new Date(item.checked) : fallbackDate,
    })),
  ];
}
