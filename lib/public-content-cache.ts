import { revalidatePath, revalidateTag } from 'next/cache';

export const PUBLIC_CONTENT_TAG = 'naqada-public-content';
export const PUBLIC_CONTENT_SCOPES = ['business', 'owner-listings', 'jobs', 'news', 'news-archive', 'article', 'role_model'] as const;
export type PublicContentScope = typeof PUBLIC_CONTENT_SCOPES[number];
export function publicContentTag(scope: PublicContentScope) { return `${PUBLIC_CONTENT_TAG}:${scope}`; }
export const NEWS_ITEMS_TAG = `${PUBLIC_CONTENT_TAG}:news-items`;
export const MAX_NEWS_REVALIDATION_ITEMS = 100;
export function isPublicNewsId(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9-]{3,90}$/i.test(value); }
export function newsItemTag(id: string) { return `${NEWS_ITEMS_TAG}:${id}`; }

// Absence is the conservative legacy/all-news contract. A targeted request must
// be bounded, complete and associated with a news scope before it can be acked.
export function revalidationNewsItems(body: object, scopes: readonly PublicContentScope[]): string[] | undefined | null {
  if (!('newsItems' in body)) return undefined;
  const items = (body as { newsItems: unknown }).newsItems;
  if (!scopes.some(scope => scope === 'news' || scope === 'news-archive') ||
    !Array.isArray(items) || !items.length || items.length > MAX_NEWS_REVALIDATION_ITEMS || items.some(id => !isPublicNewsId(id))) return null;
  return [...new Set(items)] as string[];
}

// Missing scopes are the old database webhook contract. An explicit empty list
// means no public content changed; malformed/unknown scopes must not be acked.
export function revalidationScopes(body: unknown): PublicContentScope[] | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (!('scopes' in body)) return [...PUBLIC_CONTENT_SCOPES];
  const scopes = (body as { scopes: unknown }).scopes;
  if (!Array.isArray(scopes) || scopes.length > PUBLIC_CONTENT_SCOPES.length ||
    scopes.some(scope => !PUBLIC_CONTENT_SCOPES.includes(scope))) return null;
  return [...new Set(scopes)] as PublicContentScope[];
}
export const PUBLIC_CONTENT_TTL = 3600;
const configuredReadTimeout = typeof process !== 'undefined' ? Number(process.env.NAQADA_PUBLIC_READ_TIMEOUT_MS) : 0;
export const PUBLIC_READ_TIMEOUT_MS = Number.isFinite(configuredReadTimeout) && configuredReadTimeout >= 5000 && configuredReadTimeout <= 20000 ? configuredReadTimeout : 5000;

// Only idempotent public reads may retry; moderation writes never pass here.
export async function retryPublicRead<T>(read: () => Promise<T>, kind: string): Promise<T> {
  try { return await read(); }
  catch (cause) {
    const error = cause as { name?: string; message?: string; status?: number } | null;
    const transient = error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.name === 'TypeError' ||
      /^RPC_get_public_naqada_content_(429|502|503|504)$/.test(error?.message || '') ||
      [429, 502, 503, 504].includes(error?.status || 0);
    if (!transient) throw cause;
    console.warn('PUBLIC_CONTENT_READ_RETRY', { kind, reason: error?.name || 'upstream' });
    return read();
  }
}

// Tags also invalidate dependent rendered pages. Never purge the root layout:
// changing one feed must not rebuild every directory/article/village page.
// expire: 0 is required for moderation (no stale-while-revalidate of hidden rows).
export function invalidatePublicContent(scopes: readonly PublicContentScope[] = PUBLIC_CONTENT_SCOPES, newsItems?: readonly string[]) {
  for (const scope of new Set(scopes)) revalidateTag(publicContentTag(scope), { expire: 0 });
  // Keep the explicit route/CDN invalidation for the two public headline APIs.
  if (scopes.includes('news') || scopes.includes('news-archive')) {
    // Index tags never appear on the independent item snapshots. Missing IDs
    // intentionally retain the full purge for old callers and emergencies.
    if (newsItems?.length && newsItems.length <= MAX_NEWS_REVALIDATION_ITEMS && newsItems.every(isPublicNewsId)) {
      for (const id of new Set(newsItems)) revalidateTag(newsItemTag(id), { expire: 0 });
    } else revalidateTag(NEWS_ITEMS_TAG, { expire: 0 });
    revalidatePath('/api/news');
  }
  if (scopes.includes('jobs')) revalidatePath('/api/jobs');
}
