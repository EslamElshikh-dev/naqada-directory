import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown } | null;
  if (typeof body?.id !== 'string' || !uuidPattern.test(body.id) || !['published', 'rejected'].includes(String(body.status))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) return sessionJson({ ok: false }, session, 403);
  const reply = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?id=eq.${body.id}&status=eq.pending&select=id,status`,
    {
      method: 'PATCH',
      headers: { ...restHeaders(session.accessToken, true), Prefer: 'return=representation' },
      body: JSON.stringify({ status: body.status }),
      cache: 'no-store',
    },
  ).catch(() => null);
  const rows = reply?.ok ? await reply.json() as Array<{ id: string; status: string }> : [];
  return sessionJson({ ok: rows[0]?.status === body.status }, session, rows[0]?.status === body.status ? 200 : 502);
}
