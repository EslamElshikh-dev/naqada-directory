import type { MetadataRoute } from 'next';
import { businesses, categories, localities } from '@/lib/data';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = ['', '/directory', '/villages', '/families', '/heritage', '/updates', '/coverage', '/contribute', '/privacy', '/emergency', '/about'];
  const indexableLocalities = localities.filter((item) => item.businessCount > 0);
  const comboCounts = new Map<string, { localitySlug: string; categorySlug: string; count: number }>();

  for (const business of businesses) {
    const locality = localities.find((item) => item.name === (business.locality || 'مركز نقادة'));
    const category = categories.find((item) => item.name === business.category);
    if (!locality || !category) continue;
    const key = `${locality.slug}::${category.slug}`;
    const current = comboCounts.get(key);
    comboCounts.set(key, {
      localitySlug: locality.slug,
      categorySlug: category.slug,
      count: (current?.count || 0) + 1,
    });
  }

  const localCategoryPages = [...comboCounts.values()].filter((item) => item.count >= 3);

  return [
    ...base.map((path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: new Date('2026-09-04'),
      changeFrequency: path === '' || path === '/updates' ? 'weekly' as const : 'monthly' as const,
      priority: path === '' ? 1 : path === '/updates' ? 0.85 : path === '/coverage' ? 0.8 : path === '/contribute' ? 0.75 : path === '/privacy' ? 0.45 : 0.8,
    })),
    ...categories.map((item) => ({
      url: `${siteConfig.url}/directory/${encodeURIComponent(item.slug)}`,
      lastModified: new Date('2026-09-04'),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
    ...indexableLocalities.map((item) => ({
      url: `${siteConfig.url}/villages/${encodeURIComponent(item.slug)}`,
      lastModified: new Date('2026-09-04'),
      changeFrequency: 'monthly' as const,
      priority: item.businessCount >= 5 ? 0.75 : 0.65,
    })),
    ...localCategoryPages.map((item) => ({
      url: `${siteConfig.url}/villages/${encodeURIComponent(item.localitySlug)}/${encodeURIComponent(item.categorySlug)}`,
      lastModified: new Date('2026-09-04'),
      changeFrequency: 'monthly' as const,
      priority: item.count >= 8 ? 0.75 : 0.7,
    })),
    ...businesses.map((item) => ({
      url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
      lastModified: new Date(item.checked || '2026-09-04'),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
  ];
}
