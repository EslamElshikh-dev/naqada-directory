import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/session';
import { canModerate } from '@/lib/auth/moderator';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/');
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(path)) return new NextResponse(null, { status: 400 });
  const url = `${SUPABASE_URL}/storage/v1/object/authenticated/directory-article-media/${path}`;
  let response = await fetch(url, { headers: restHeaders(), cache: 'no-store', signal: AbortSignal.timeout(10000) }).catch(() => null);
  let preview = false;
  if (!response?.ok) {
    const session = await resolveSession();
    if (!session || !(await canModerate(session.accessToken))) return new NextResponse(null, { status: 404 });
    preview = true;
    response = await fetch(url, { headers: restHeaders(session.accessToken), cache: 'no-store', signal: AbortSignal.timeout(10000) }).catch(() => null);
  }
  if (!response?.ok || !response.body) return new NextResponse(null, { status: 404 });
  if (!response.headers.get('content-type')?.startsWith('image/webp')) return new NextResponse(null, { status: 415 });
  return new NextResponse(response.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': preview ? 'private, no-store' : 'public, max-age=30, s-maxage=60', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' } });
}
