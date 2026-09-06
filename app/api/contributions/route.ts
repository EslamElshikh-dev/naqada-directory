import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { sameOrigin } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INTAKE_URL = 'https://ceyjfguoomdlrtsujskj.supabase.co/functions/v1/directory-intake';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'origin_not_allowed' }, { status: 403 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const session = await resolveSession();
  const origin = request.headers.get('origin') || new URL(request.url).origin;
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: origin,
  };
  if (forwardedFor) headers['X-Client-IP'] = forwardedFor;
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  try {
    const upstream = await fetch(INTAKE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...body, action: 'contribution' }),
      cache: 'no-store',
    });
    const payload = await upstream.json().catch(() => ({ ok: false, error: 'invalid_response' }));
    return sessionJson(payload, session, upstream.status);
  } catch {
    return sessionJson({ ok: false, error: 'network_error' }, session, 502);
  }
}
