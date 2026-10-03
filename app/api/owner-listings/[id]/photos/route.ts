import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';
import { ownerListingSelect, type OwnerListing } from '@/lib/owner-listings';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ id: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxSize = 4 * 1024 * 1024;
const types: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function ownListing(id: string, ownerId: string, token: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?id=eq.${id}&owner_user_id=eq.${ownerId}&select=${ownerListingSelect}&limit=1`,
    { headers: restHeaders(token), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('lookup');
  const rows = await response.json() as OwnerListing[];
  return rows[0] || null;
}

function imageSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  return type === 'image/webp' && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

async function saveMedia(listing: OwnerListing, token: string, patch: { photo_paths?: string[]; cover_path?: string | null }) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?id=eq.${listing.id}&owner_user_id=eq.${listing.owner_user_id}&updated_at=eq.${encodeURIComponent(listing.updated_at)}&select=${ownerListingSelect}`,
    {
      method: 'PATCH',
      headers: { ...restHeaders(token, true), Prefer: 'return=representation' },
      body: JSON.stringify(patch),
      cache: 'no-store',
    },
  );
  if (!response.ok) throw new Error('save');
  const [updated] = await response.json() as OwnerListing[];
  if (!updated) throw new Error('conflict');
  return updated;
}

async function discardPhoto(path: string, token: string) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/directory-owner-photos`, {
    method: 'DELETE', headers: restHeaders(token, true), body: JSON.stringify({ prefixes: [path] }), cache: 'no-store',
  }).catch(() => null);
}

export async function POST(request: Request, { params }: Props) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'النشاط غير موجود.' }, { status: 404 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'سجّل دخولك الأول.' }, { status: 401 });
  if (!request.headers.get('content-type')?.includes('multipart/form-data') || Number(request.headers.get('content-length')) > maxSize + 100_000) {
    return sessionJson({ error: 'ارفع صورة واحدة أقل من ٤ ميجابايت.' }, session, 413);
  }
  try {
    const listing = await ownListing(id, session.user.id, session.accessToken);
    if (!listing) return sessionJson({ error: 'النشاط غير موجود في حسابك.' }, session, 404);
    const form = await request.formData();
    const role = form.get('role') || 'gallery';
    if (role !== 'gallery' && role !== 'cover') return sessionJson({ error: 'اختار صورة للغلاف أو للمعرض.' }, session, 400);
    if (role === 'gallery' && listing.photo_paths.length >= 5) return sessionJson({ error: 'الحد الأقصى ٥ صور للمعرض، بالإضافة إلى صورة الغلاف.' }, session, 400);
    const file = form.get('photo');
    if (!(file instanceof File) || !types[file.type] || !file.size || file.size > maxSize) {
      return sessionJson({ error: 'الصورة لازم تكون JPG أو PNG أو WebP وأقل من ٤ ميجابايت.' }, session, 400);
    }
    const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!imageSignature(signature, file.type)) return sessionJson({ error: 'ملف الصورة غير صالح.' }, session, 400);
    const optimized = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 24_000_000, animated: false })
      .rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const path = `${session.user.id}/${id}/${crypto.randomUUID()}.webp`;
    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/directory-owner-photos/${path}`, {
      method: 'POST',
      headers: { ...restHeaders(session.accessToken), 'Content-Type': 'image/webp', 'x-upsert': 'false', 'Cache-Control': 'max-age=3600' },
      body: new Uint8Array(optimized),
      cache: 'no-store',
    });
    if (!upload.ok) throw new Error('upload');
    let updated: OwnerListing;
    try {
      updated = await saveMedia(listing, session.accessToken, role === 'cover'
        ? { cover_path: path } : { photo_paths: [...listing.photo_paths, path] });
    } catch (failure) {
      await discardPhoto(path, session.accessToken);
      throw failure;
    }
    if (role === 'cover' && listing.cover_path && !listing.photo_paths.includes(listing.cover_path)) {
      await discardPhoto(listing.cover_path, session.accessToken);
    }
    return sessionJson({ listing: updated }, session, 201);
  } catch (failure) {
    if (failure instanceof Error && failure.message === 'conflict') return sessionJson({ error: 'النشاط اتعدّل في نفس اللحظة. حدّث الصفحة وحاول تاني.' }, session, 409);
    return sessionJson({ error: 'تعذر رفع الصورة. جرّب صورة أصغر أو حاول تاني.' }, session, 502);
  }
}

export async function PATCH(request: Request, { params }: Props) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  if (!request.headers.get('content-type')?.includes('application/json') || Number(request.headers.get('content-length')) > 2000) {
    return NextResponse.json({ error: 'بيانات الغلاف غير صالحة.' }, { status: 400 });
  }
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'النشاط غير موجود.' }, { status: 404 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'سجّل دخولك الأول.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { cover_path?: unknown } | null;
  try {
    const listing = await ownListing(id, session.user.id, session.accessToken);
    if (!listing || !body || (body.cover_path !== null && (typeof body.cover_path !== 'string' || !listing.photo_paths.includes(body.cover_path)))) {
      return sessionJson({ error: 'اختار الغلاف من صور نشاطك.' }, session, 400);
    }
    const updated = await saveMedia(listing, session.accessToken, { cover_path: body.cover_path as string | null });
    if (listing.cover_path && listing.cover_path !== updated.cover_path && !listing.photo_paths.includes(listing.cover_path)) {
      await discardPhoto(listing.cover_path, session.accessToken);
    }
    return sessionJson({ listing: updated }, session);
  } catch {
    return sessionJson({ error: 'تعذر تغيير الغلاف. حدّث الصفحة وحاول تاني.' }, session, 502);
  }
}

export async function DELETE(request: Request, { params }: Props) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'النشاط غير موجود.' }, { status: 404 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'سجّل دخولك الأول.' }, { status: 401 });
  const body = await request.json().catch(() => null) as { path?: unknown } | null;
  try {
    const listing = await ownListing(id, session.user.id, session.accessToken);
    if (!listing || typeof body?.path !== 'string' || !listing.photo_paths.includes(body.path)) {
      return sessionJson({ error: 'الصورة غير موجودة في نشاطك.' }, session, 404);
    }
    const updated = await saveMedia(listing, session.accessToken, {
      photo_paths: listing.photo_paths.filter((path) => path !== body.path),
      ...(listing.cover_path === body.path ? { cover_path: null } : {}),
    });
    await discardPhoto(body.path, session.accessToken);
    return sessionJson({ listing: updated }, session);
  } catch {
    return sessionJson({ error: 'تعذر حذف الصورة دلوقت.' }, session, 502);
  }
}
