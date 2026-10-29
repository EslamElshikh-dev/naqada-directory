import { revalidatePath, revalidateTag } from 'next/cache';

export const PUBLIC_CONTENT_TAG = 'naqada-public-content';
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

// Moderation must expire old rows immediately, including records that were hidden.
export function invalidatePublicContent() {
  revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 });
  revalidatePath('/', 'layout');
  revalidatePath('/api/news');
  revalidatePath('/api/jobs');
  revalidatePath('/api/news/feed');
}
