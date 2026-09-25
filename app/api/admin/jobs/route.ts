import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/session';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) || !['published', 'rejected'].includes(body.status)) return NextResponse.json({ ok: false }, { status: 400 });
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) return NextResponse.json({ ok: false }, { status: 403 });
  const reply = await fetch(`${SUPABASE_URL}/rest/v1/rpc/moderate_naqada_job`, { method: 'POST', cache: 'no-store', headers: restHeaders(session.accessToken, true), body: JSON.stringify({ p_id: body.id, p_status: body.status }) });
  return NextResponse.json({ ok: reply.ok && (await reply.json().catch(() => false)) === true }, { status: reply.ok ? 200 : 502 });
}
