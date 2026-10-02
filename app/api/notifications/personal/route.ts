import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { getGoldModeratorNotifications, canModerate } from '@/lib/auth/moderator';
import { getRequestNotifications, mergePersonalNotices } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: 'سجّل دخولك لعرض إشعارات حسابك.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
  }
  try {
    const [requests, moderation] = await Promise.all([
      getRequestNotifications(session.accessToken),
      canModerate(session.accessToken).then((allowed) => allowed ? getGoldModeratorNotifications(session.accessToken) : null),
    ]);
    return sessionJson({ generatedAt: new Date().toISOString(), items: mergePersonalNotices(requests.items, moderation?.items || []) }, session);
  } catch {
    return sessionJson({ error: 'تعذّر تحميل إشعارات حسابك.' }, session, 502);
  }
}
