import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { canModerate, getEditorContent, getModeratorDashboard } from '@/lib/auth/moderator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) {
    return NextResponse.json({ error: 'هذه المساحة للمشرفين فقط.' }, { status: 403 });
  }
  try {
    const search = new URL(request.url).searchParams.get('member') || '';
    const [dashboard, content] = await Promise.all([
      getModeratorDashboard(session.accessToken, search),
      getEditorContent(session.accessToken),
    ]);
    return sessionJson({ dashboard, content }, session);
  } catch {
    return sessionJson({ error: 'تعذّر تحديث بيانات الإشراف الآن. حاول مجددًا.' }, session, 502);
  }
}
