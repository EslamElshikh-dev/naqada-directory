import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { getGoldModeratorNotifications, canModerate } from '@/lib/auth/moderator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) {
    return NextResponse.json({ error: 'هذه الإشعارات خاصة بإدارة الدليل والمشرفين.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    const notices = await getGoldModeratorNotifications(session.accessToken);
    return sessionJson(notices, session);
  } catch {
    return sessionJson({ error: 'تعذّر تحميل إشعارات الإشراف.' }, session, 502);
  }
}
