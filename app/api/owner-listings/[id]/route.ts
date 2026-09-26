import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';
import { ownerListingSelect, type OwnerListing } from '@/lib/owner-listings';
import { validateOwnerListing } from '@/lib/owner-listing-validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ id: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'النشاط غير موجود.' }, { status: 404 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'سجّل دخولك الأول.' }, { status: 401 });
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?id=eq.${id}&owner_user_id=eq.${session.user.id}&select=${ownerListingSelect}&limit=1`,
    { headers: restHeaders(session.accessToken), cache: 'no-store' },
  );
  if (!response.ok) return sessionJson({ error: 'تعذر تحميل النشاط.' }, session, 502);
  const [listing] = await response.json() as OwnerListing[];
  return sessionJson(listing ? { listing } : { error: 'النشاط غير موجود في حسابك.' }, session, listing ? 200 : 404);
}

export async function PATCH(request: Request, { params }: Props) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'النشاط غير موجود.' }, { status: 404 });
  if (!request.headers.get('content-type')?.includes('application/json') || Number(request.headers.get('content-length')) > 20_000) {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'سجّل دخولك الأول.' }, { status: 401 });
  const validation = validateOwnerListing(await request.json().catch(() => null));
  if ('error' in validation) return sessionJson({ error: validation.error }, session, 400);
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/directory_owner_listings?id=eq.${id}&owner_user_id=eq.${session.user.id}&select=${ownerListingSelect}`,
      {
        method: 'PATCH',
        headers: { ...restHeaders(session.accessToken, true), Prefer: 'return=representation' },
        body: JSON.stringify(validation.data),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error('update');
    const [listing] = await response.json() as OwnerListing[];
    return sessionJson(listing ? { listing } : { error: 'النشاط غير موجود في حسابك.' }, session, listing ? 200 : 404);
  } catch {
    return sessionJson({ error: 'تعذر حفظ التعديل. حاول تاني.' }, session, 502);
  }
}
