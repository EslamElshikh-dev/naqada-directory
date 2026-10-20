import type { MetadataRoute } from 'next';
import { activityLandings, getBusinessesForActivity } from './activity-landings';
import { localities } from './data';
import { absoluteUrl } from './site';

// Keep the focused crawl list aligned with the guides featured on the homepage.
export const priorityLocalityNames = ['بشلاو', 'الأوسط قمولا', 'طوخ', 'الخطارة', 'دنفيق'];
export const priorityActivityNames = ['صيدليات نقادة', 'أطباء وعيادات نقادة', 'مدارس ومعاهد نقادة', 'مطاعم ومقاهي نقادة', 'محلات وأسواق نقادة'];

export const prioritySitemapUrls = new Set([
  ...['/', '/directory', '/activities', '/villages', '/blog', '/role-models', '/about', '/developer'].map(absoluteUrl),
  ...localities.filter((item) => priorityLocalityNames.includes(item.name))
    .map((item) => absoluteUrl(`/villages/${encodeURIComponent(item.slug)}`)),
  ...activityLandings.filter((item) => priorityActivityNames.includes(item.name) && getBusinessesForActivity(item).length >= 2)
    .map((item) => absoluteUrl(`/activities/${encodeURIComponent(item.slug)}`)),
]);

export function selectPrioritySitemap(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  // Select only URLs already accepted by the full sitemap and preserve their real dates.
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (!prioritySitemapUrls.has(entry.url) || seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
