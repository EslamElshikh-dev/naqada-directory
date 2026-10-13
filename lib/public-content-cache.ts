import { revalidateTag } from 'next/cache';

export const PUBLIC_CONTENT_TAG = 'naqada-public-content';
export const PUBLIC_CONTENT_TTL = 60;
export const PUBLIC_READ_TIMEOUT_MS = 5000;

// Moderation must expire old rows immediately, including records that were hidden.
export function invalidatePublicContent() {
  revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 });
}
