import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VISITOR_COOKIE = 'naqada_visitor';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deviceClass(userAgent: string) {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return 'tablet';
  if (/mobi|android|iphone|ipod/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

function cleanPath(value: unknown) {
  if (typeof value !== 'string') return '/';
  const path = value.trim().slice(0, 240);
  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

function cleanHost(value: unknown) {
  if (typeof value !== 'string') return '';
  const host = value.trim().toLowerCase().slice(0, 160);
  return /^[a-z0-9.-]+$/.test(host) ? host : '';
}

async function recordVisit(visitorId: string, path: string, referrerHost: string, device: string, accessToken?: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/record_naqada_visit`, {
    method: 'POST',
    headers: restHeaders(accessToken, true),
    body: JSON.stringify({ p_visitor_id: visitorId, p_path: path, p_referrer_host: referrerHost || null, p_device_class: device }),
    cache: 'no-store',
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const storedId = request.cookies.get(VISITOR_COOKIE)?.value || '';
  const visitorId = UUID_PATTERN.test(storedId) ? storedId : randomUUID();
  const path = cleanPath(body?.path);
  const referrerHost = cleanHost(body?.referrerHost);
  const device = deviceClass(request.headers.get('user-agent') || '');
  const token = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;

  let result = await recordVisit(visitorId, path, referrerHost, device, token).catch(() => null);
  if (token && result && (result.status === 401 || result.status === 403)) {
    result = await recordVisit(visitorId, path, referrerHost, device).catch(() => null);
  }

  const response = new NextResponse(null, {
    status: result?.ok ? 204 : 202,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });
  if (visitorId !== storedId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      priority: 'medium',
    });
  }
  return response;
}
