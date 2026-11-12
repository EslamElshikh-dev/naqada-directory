import { revalidatePath, revalidateTag } from 'next/cache';

export const PUBLIC_CONTENT_TAG = 'naqada-public-content';
export const PUBLIC_CONTENT_SCOPES = ['business', 'owner-listings', 'jobs', 'news', 'news-archive', 'article', 'role_model'] as const;
export type PublicContentScope = typeof PUBLIC_CONTENT_SCOPES[number];
export function publicContentTag(scope: PublicContentScope) { return `${PUBLIC_CONTENT_TAG}:${scope}`; }

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
export function invalidatePublicContent(scopes: readonly PublicContentScope[] = PUBLIC_CONTENT_SCOPES) {
  for (const scope of new Set(scopes)) revalidateTag(publicContentTag(scope), { expire: 0 });
  // Keep the explicit route/CDN invalidation for the two public headline APIs.
  if (scopes.includes('news') || scopes.includes('news-archive')) revalidatePath('/api/news');
  if (scopes.includes('jobs')) revalidatePath('/api/jobs');
}
