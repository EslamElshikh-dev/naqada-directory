import type { MetadataRoute } from 'next';
import { businesses, categories, localities } from '@/lib/data';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = ['', '/directory', '/villages', '/families', '/heritage', '/updates', '/emergency', '/about'];
  const indexableLocalities = localities.filter((item) => item.businessCount > 0);

  return [
    ...base.map((path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: new Date('2026-09-04'),
      changeFrequency: path === '' || path === '/updates' ? 'weekly' as const : 'monthly' as const,
      priority: path === '' ? 1 : path === '/updates' ? 0.85 : 0.8,
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
    ...businesses.map((item) => ({
      url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
      lastModified: new Date(item.checked || '2026-09-04'),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
  ];
}
