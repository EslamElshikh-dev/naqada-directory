import { unstable_cache } from 'next/cache';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { PUBLIC_CONTENT_TAG } from '@/lib/public-content-cache';
import { siteConfig } from '@/lib/site';
// The same public summary endpoint as the visible rating widget. No rater IDs,
// hashes or third-party ratings are read or copied into structured data.
export const getListingRatingSummary = unstable_cache(async (slug: string): Promise<{count:number;average:number}|null> => {
  try {
    const url = new URL(`${SUPABASE_URL}/functions/v1/directory-intake`);
    url.searchParams.set('action','rating');url.searchParams.set('listingSlug',slug);
    const response = await fetch(url,{headers:{...restHeaders(),Origin:siteConfig.url},cache:'no-store',signal:AbortSignal.timeout(2000)});
    if (!response.ok) return null;
    const data = await response.json();
    return data.ok && data.summary ? data.summary : null;
  } catch { return null; }
}, ['directory-rating-summary-v1'], {revalidate:3600,tags:[PUBLIC_CONTENT_TAG]});
