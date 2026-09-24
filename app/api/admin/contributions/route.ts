import { NextResponse } from 'next/server';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { reviewContribution, type ContributionReviewAction } from '@/lib/auth/contribution-operations';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { sameOrigin } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const actions = new Set<ContributionReviewAction>(['start_review', 'request_info', 'approve', 'reject', 'mark_published', 'reopen']);

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session || !(await isDirectoryAdmin(session.accessToken))) {
    return sessionJson({ ok: false, error: 'غير مصرح بإدارة المساهمات.' }, session, 403);
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return sessionJson({ ok: false, error: 'بيانات الطلب غير صالحة.' }, session, 400);

  const id = clean(body.id, 64);
  const action = clean(body.action, 40) as ContributionReviewAction;
  const notes = clean(body.notes, 2000);
  const message = clean(body.message, 600);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !actions.has(action)) {
    return sessionJson({ ok: false, error: 'إجراء المراجعة غير صالح.' }, session, 400);
  }
  if (action === 'request_info' && !message) {
    return sessionJson({ ok: false, error: 'اكتب الرسالة التي سيشاهدها المساهم لتوضيح المعلومات المطلوبة.' }, session, 400);
  }
  if (action === 'reject' && !notes) {
    return sessionJson({ ok: false, error: 'اكتب سبب الرفض في ملاحظات الإدارة.' }, session, 400);
  }

  try {
    const result = await reviewContribution(session.accessToken, { id, action, notes, message });
    return sessionJson(result, session);
  } catch {
    return sessionJson({ ok: false, error: 'تعذر تحديث حالة المساهمة الآن.' }, session, 502);
  }
}
