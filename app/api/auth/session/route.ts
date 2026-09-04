import { NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, authCookieBase } from '@/lib/auth/supabase-rest';
import { resolveSession, sessionJson } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await resolveSession();
  if (session) return sessionJson({ user: session.user }, session);
  const response = NextResponse.json({ user: null }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });
  response.cookies.set(AUTH_ACCESS_COOKIE, '', { ...authCookieBase, maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, '', { ...authCookieBase, maxAge: 0 });
  return response;
}
