import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ path: string[] }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const filePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export async function GET(_request: Request, { params }: Props) {
  const { path } = await params;
  if (path.length !== 3 || !uuidPattern.test(path[0]) || !uuidPattern.test(path[1]) || !filePattern.test(path[2])) {
    return new NextResponse(null, { status: 404 });
  }
  const session = await resolveSession(false);
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/authenticated/directory-owner-photos/${path.map(encodeURIComponent).join('/')}`,
    { headers: restHeaders(session?.accessToken), cache: 'no-store' },
  ).catch(() => null);
  if (!response?.ok) return new NextResponse(null, { status: 404 });
  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
