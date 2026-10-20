import type { MetadataRoute } from 'next';
import sitemap from '../sitemap';
import { selectPrioritySitemap } from '@/lib/seo-priorities';

export const dynamic = 'force-dynamic';

export default async function prioritySitemap(): Promise<MetadataRoute.Sitemap> {
  return selectPrioritySitemap(await sitemap());
}
