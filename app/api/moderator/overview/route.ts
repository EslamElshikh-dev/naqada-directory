import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { canModerate, getEditorContent, getModeratorDashboard } from '@/lib/auth/moderator';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { getOpenSearchGaps } from '@/lib/growth-priority';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) {
    return NextResponse.json({ error: 'هذه المساحة للمشرفين فقط.' }, { status: 403 });
  }
  try {
    const search = new URL(request.url).searchParams.get('member') || '';
    const [rawDashboard, content, catalog] = await Promise.all([
      getModeratorDashboard(session.accessToken, search),
      getEditorContent(session.accessToken),
      getPublicBusinessCatalog().catch(() => null),
    ]);
    const dashboard = { ...rawDashboard, missedSearches: getOpenSearchGaps(rawDashboard.missedSearches, catalog?.businesses) };
    return sessionJson({ dashboard, content }, session);
  } catch {
    return sessionJson({ error: 'تعذّر تحديث بيانات الإشراف الآن. حاول مجددًا.' }, session, 502);
  }
}
