import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { canModerate, callModeratorAction } from '@/lib/auth/moderator';
import { sameOrigin } from '@/lib/auth/supabase-rest';
import { categories, localities, businesses } from '@/lib/data';
import { getContributionQueue } from '@/lib/contribution-review';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) return sessionJson({ error: 'المراجعة للمشرفين فقط.' }, session, 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)
    || !['publish', 'reviewing', 'needs_info', 'rejected'].includes(body.action)) return sessionJson({ error: 'طلب غير صالح.' }, session, 400);
  try {
    const item = (await getContributionQueue(session.accessToken)).find((row) => row.id === body.id);
    if (!item) return sessionJson({ error: 'الطلب اتراجع بالفعل. حدّث القائمة.' }, session, 409);
    if (body.action === 'publish') {
      const limits: Record<string, number> = { title: 160, summary: 2000, category: 120, locality: 160, phone: 20, address: 240, sourceUrl: 1000 };
      if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)
        || Object.keys(body.payload).some((key) => !(key in limits))) throw Error('INVALID');
      const payload: Record<string, string> = {};
      for (const [key, limit] of Object.entries(limits)) {
        if (typeof body.payload[key] !== 'string' || body.payload[key].length > limit) throw Error('INVALID');
        payload[key] = body.payload[key].trim();
      }
      if (payload.title.length < 3 || payload.summary.length < 15
        || !categories.some((c) => c.name === payload.category)
        || !localities.some((l) => l.name === payload.locality)
        || (payload.phone && !/^\+?\d{10,15}$/.test(payload.phone))
        || (payload.sourceUrl && (!/^https?:\/\//i.test(payload.sourceUrl) || !URL.canParse(payload.sourceUrl)))) throw Error('INVALID');
      if (item.requestType === 'correction' && !businesses.some((b) => b.slug === item.listingSlug)) throw Error('INVALID');
      const result = await callModeratorAction(session.accessToken, 'publish_naqada_contribution', { p_id: item.id, p_payload: payload });
      return sessionJson({ ok: true, result }, session);
    }
    await callModeratorAction(session.accessToken, 'moderate_naqada_submission', {
      p_kind: 'contribution', p_id: item.id, p_status: body.action, p_patch: {},
    });
    return sessionJson({ ok: true }, session);
  } catch (error) {
    return sessionJson({ error: error instanceof Error && error.message === 'INVALID'
      ? 'راجع الاسم والوصف والقسم والمكان والرقم قبل النشر.' : 'تعذّر حفظ المراجعة. حدّث الصفحة وحاول تاني.' }, session, 422);
  }
}
