import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieBase,
  getUser,
  mapMember,
  refreshSession,
  type MemberUser,
} from '@/lib/auth/supabase-rest';

export type ResolvedSession = {
  accessToken: string;
  user: MemberUser;
  refreshed?: { accessToken: string; refreshToken: string; expiresIn: number };
};

export async function resolveSession(allowRefresh = true): Promise<ResolvedSession | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;
  if (accessToken) {
    try {
      return { accessToken, user: mapMember(await getUser(accessToken)) };
    } catch {
      // Continue to refresh when the caller can persist rotated cookies.
    }
  }
  if (!allowRefresh || !refreshToken) return null;
  try {
    const fresh = await refreshSession(refreshToken);
    return {
      accessToken: fresh.access_token,
      user: mapMember(fresh.user),
      refreshed: {
        accessToken: fresh.access_token,
        refreshToken: fresh.refresh_token,
        expiresIn: fresh.expires_in || 3600,
      },
    };
  } catch {
    return null;
  }
}

export function sessionJson(payload: unknown, session: ResolvedSession | null, status = 200) {
  const response = NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });
  if (session?.refreshed) {
    response.cookies.set(AUTH_ACCESS_COOKIE, session.refreshed.accessToken, {
      ...authCookieBase,
      maxAge: Math.max(300, session.refreshed.expiresIn - 60),
    });
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refreshed.refreshToken, {
      ...authCookieBase,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
