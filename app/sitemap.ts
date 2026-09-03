import type { MetadataRoute } from 'next';
import { businesses, categories, localities } from '@/lib/data';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = ['', '/directory', '/villages', '/families', '/heritage', '/emergency', '/about'];
  return [
    ...base.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: new Date('2026-09-03'), changeFrequency: path === '' ? 'weekly' as const : 'monthly' as const, priority: path === '' ? 1 : 0.8 })),
    ...categories.map((item) => ({ url: `${siteConfig.url}/directory/${encodeURIComponent(item.slug)}`, lastModified: new Date('2026-09-03'), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...localities.map((item) => ({ url: `${siteConfig.url}/villages/${encodeURIComponent(item.slug)}`, lastModified: new Date('2026-09-03'), changeFrequency: 'monthly' as const, priority: item.businessCount ? 0.7 : 0.5 })),
    ...businesses.map((item) => ({ url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`, lastModified: new Date(item.checked || '2026-09-03'), changeFrequency: 'monthly' as const, priority: 0.65 })),
  ];
}
