import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';
import { ownerListingSelect, type OwnerListing } from '@/lib/owner-listings';
import { validateOwnerListing } from '@/lib/owner-listing-validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'سجّل دخولك لعرض أنشطتك.' }, { status: 401 });
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/directory_owner_listings?owner_user_id=eq.${session.user.id}&select=${ownerListingSelect}&order=created_at.desc&limit=100`,
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!response.ok) throw new Error('load');
    return sessionJson({ listings: await response.json() as OwnerListing[] }, session);
  } catch {
    return sessionJson({ error: 'تعذر تحميل أنشطتك دلوقت.' }, session, 502);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  if (!request.headers.get('content-type')?.includes('application/json') || Number(request.headers.get('content-length')) > 20_000) {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'سجّل دخولك الأول عشان يبقى النشاط باسمك.' }, { status: 401 });
  const validation = validateOwnerListing(await request.json().catch(() => null));
  if ('error' in validation) return sessionJson({ error: validation.error }, session, 400);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/directory_owner_listings?select=${ownerListingSelect}`, {
      method: 'POST',
      headers: { ...restHeaders(session.accessToken, true), Prefer: 'return=representation' },
      body: JSON.stringify({ ...validation.data, owner_user_id: session.user.id }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('save');
    const [listing] = await response.json() as OwnerListing[];
    if (!listing) throw new Error('empty');
    return sessionJson({ listing }, session, 201);
  } catch {
    return sessionJson({ error: 'تعذر حفظ النشاط. راجع البيانات وحاول تاني.' }, session, 502);
  }
}
