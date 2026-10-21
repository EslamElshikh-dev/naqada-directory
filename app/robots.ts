import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Published photo responses are public assets; other API routes stay excluded.
      allow: ['/', '/api/owner-photos/', '/api/directory/photo'],
      disallow: ['/api/'],
    },
    sitemap: [`${siteConfig.url}/sitemap.xml`, `${siteConfig.url}/priority/sitemap.xml`],
  };
}
