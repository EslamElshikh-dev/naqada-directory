import { AUTH_RETURN_COOKIE, safeAuthReturn } from '@/lib/auth/return-path';
import { NextResponse } from 'next/server';
import { SUPABASE_URL } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', `${origin}/account/oauth-callback`);
  const response = NextResponse.redirect(authorizeUrl, { status: 302 });
  const next = safeAuthReturn(new URL(request.url).searchParams.get('next'));
  response.cookies.set(AUTH_RETURN_COOKIE, next, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
