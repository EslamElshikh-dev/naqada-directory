export const OWNER_PHOTO_WIDTHS = [256, 384, 640, 960, 1280, 1800] as const;
export const MAX_OWNER_PHOTO_BYTES = 8 * 1024 * 1024;

export function ownerPhotoWidth(value: string | null): number | undefined | null {
  if (value === null) return undefined;
  if (!/^\d{3,4}$/.test(value)) return null;
  const width = Number(value);
  return OWNER_PHOTO_WIDTHS.some((candidate) => candidate === width) ? width : null;
}

export function ownerPhotoLoader({ src, width }: { src: string; width: number }) {
  if (!src.startsWith('/api/owner-photos/')) return src;
  const size = OWNER_PHOTO_WIDTHS.find((candidate) => candidate >= width) || OWNER_PHOTO_WIDTHS.at(-1)!;
  const [pathname, query = ''] = src.split('?');
  const params = new URLSearchParams(query);
  params.set('w', String(size));
  return `${pathname}?${params.toString()}`;
}

export function rasterPhotoSignature(bytes: Uint8Array) {
  return (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    || (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
}

export async function boundedPhotoBytes(response: Response) {
  if (!response.body || Number(response.headers.get('content-length') || 0) > MAX_OWNER_PHOTO_BYTES) throw Error('PHOTO_TOO_LARGE');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_OWNER_PHOTO_BYTES) throw Error('PHOTO_TOO_LARGE');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
