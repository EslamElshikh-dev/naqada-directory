import { NextRequest, NextResponse } from 'next/server';
import { canModerate } from '@/lib/auth/moderator';
import { resolveSession } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') || '';
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[a-zA-Z0-9_.-]{1,120}$/i.test(path)) {
    return new NextResponse(null, { status: 400 });
  }
  const preview = request.nextUrl.searchParams.get('preview') === '1';
  const session = preview ? await resolveSession() : null;
  if (preview && (!session || !(await canModerate(session.accessToken)))) {
    return new NextResponse(null, { status: 403 });
  }
  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/authenticated/directory-owner-photos/${path.split('/').map(encodeURIComponent).join('/')}`,
    { headers: restHeaders(session?.accessToken), cache: 'no-store' },
  ).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new NextResponse(null, { status: 404 });
  const type = upstream.headers.get('content-type') || '';
  if (!type.startsWith('image/')) return new NextResponse(null, { status: 415 });
  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': preview ? 'private, no-store' : 'public, s-maxage=60, max-age=30',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
