import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { canModerate } from '@/lib/auth/moderator';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) return NextResponse.json({ error: 'هذه المساحة للمشرفين فقط.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 4_300_000) return sessionJson({ error: 'اختاري صورة أقل من ٤ ميجابايت.' }, session, 413);
  try {
    const form = await request.formData();
    const photo = form.get('photo');
    if (!(photo instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || !photo.size || photo.size > 4_000_000) return sessionJson({ error: 'اختاري صورة JPG أو PNG أو WebP أقل من ٤ ميجابايت.' }, session, 400);
    const { data, info } = await sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 32_000_000, animated: false })
      .rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
    const path = `${session.user.id}/${randomUUID()}.webp`;
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/directory-article-media/${path}`, {
      method: 'POST', headers: { ...restHeaders(session.accessToken), 'Content-Type': 'image/webp', 'x-upsert': 'false' },
      body: new Uint8Array(data), cache: 'no-store', signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw Error('upload failed');
    return sessionJson({ src: `/api/article-media/${path}`, width: info.width, height: info.height }, session, 201);
  } catch { return sessionJson({ error: 'تعذّر رفع الصورة. جرّبي صورة أصغر أو أعيدي المحاولة.' }, session, 502); }
}
