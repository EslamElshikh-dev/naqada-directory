import { NextResponse } from 'next/server';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieBase,
  authErrorMessage,
  getUser,
  mapMember,
  sameOrigin,
} from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  try {
    const body = await request.json();
    const accessToken = String(body?.accessToken || '');
    const refreshToken = String(body?.refreshToken || '');
    const expiresIn = Number(body?.expiresIn || 3600);
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'بيانات تسجيل الدخول عبر Google غير مكتملة.' }, { status: 400 });
    }

    const user = await getUser(accessToken);
    const response = NextResponse.json({ user: mapMember(user) });
    response.cookies.set(AUTH_ACCESS_COOKIE, accessToken, {
      ...authCookieBase,
      maxAge: Math.max(300, Math.min(expiresIn, 3600) - 60),
    });
    response.cookies.set(AUTH_REFRESH_COOKIE, refreshToken, {
      ...authCookieBase,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 401 });
  }
}
