import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import sharp from 'sharp';
import { boundedPhotoBytes, ownerPhotoWidth, rasterPhotoSignature } from '@/lib/owner-photo-delivery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ path: string[] }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const filePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export async function GET(request: Request, { params }: Props) {
  const { path } = await params;
  if (path.length !== 3 || !uuidPattern.test(path[0]) || !uuidPattern.test(path[1]) || !filePattern.test(path[2])) {
    return new NextResponse(null, { status: 404 });
  }
  const query = new URL(request.url).searchParams;
  const width = ownerPhotoWidth(query.get('w'));
  if (width === null || query.getAll('w').length > 1) return new NextResponse(null, { status: 400 });
  const session = await resolveSession(false);
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/authenticated/directory-owner-photos/${path.map(encodeURIComponent).join('/')}`,
    { headers: restHeaders(session?.accessToken), cache: 'no-store', signal: AbortSignal.timeout(8000) },
  ).catch(() => null);
  if (!response?.ok) return new NextResponse(null, { status: 404 });
  const contentType = response.headers.get('content-type')?.split(';')[0].toLowerCase() || '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return new NextResponse(null, { status: 415 });
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=300',
    Vary: 'Cookie',
    'X-Content-Type-Options': 'nosniff',
  };
  if (width !== undefined) {
    try {
      const source = await boundedPhotoBytes(response);
      if (!rasterPhotoSignature(source)) return new NextResponse(null, { status: 415 });
      const preview = await sharp(Buffer.from(source), { limitInputPixels: 24_000_000, animated: false })
        .rotate().resize({ width, height: width * 3, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 76 }).toBuffer();
      return new NextResponse(new Uint8Array(preview), {
        headers: { ...headers, 'Content-Type': 'image/webp', 'Content-Length': String(preview.byteLength) },
      });
    } catch (error) {
      return new NextResponse(null, { status: error instanceof Error && error.message === 'PHOTO_TOO_LARGE' ? 413 : 415 });
    }
  }
  return new NextResponse(response.body, {
    headers,
  });
}
