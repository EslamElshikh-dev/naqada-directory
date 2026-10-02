import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { canModerate } from '@/lib/auth/moderator';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReviewResult = { ok?: boolean; id?: string; status?: string; code?: string };

function saveFailed(session: Awaited<ReturnType<typeof resolveSession>>) {
  return sessionJson({ ok: false, code: 'REVIEW_SAVE_FAILED', error: 'تعذّر حفظ القرار الآن. حاول مرة أخرى بعد قليل.' }, session, 502);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'طلب غير مسموح.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown } | null;
  if (typeof body?.id !== 'string' || !uuidPattern.test(body.id) || !['published', 'rejected'].includes(String(body.status))) {
    return NextResponse.json({ ok: false, code: 'INVALID_REQUEST', error: 'بيانات الطلب غير صحيحة. حدّث الصفحة وحاول مرة أخرى.' }, { status: 400 });
  }
  const session = await resolveSession();
  try {
    if (!session || !(await canModerate(session.accessToken))) {
      return sessionJson({ ok: false, code: 'NOT_AUTHORIZED', error: 'انتهت جلستك أو ليس لديك صلاحية المراجعة. سجّل الدخول مجددًا.' }, session, 403);
    }
    const reply = await fetch(`${SUPABASE_URL}/rest/v1/rpc/review_naqada_owner_listing`, {
      method: 'POST',
      headers: restHeaders(session.accessToken, true),
      body: JSON.stringify({ p_id: body.id, p_status: body.status }),
      cache: 'no-store',
    });
    const result = await reply.json().catch(() => null) as ReviewResult | null;
    if (!reply.ok || !result) {
      console.error('owner_activity_review_failed', { upstreamStatus: reply.status, code: result?.code?.match(/^[A-Z0-9_]{1,40}$/)?.[0] || 'INVALID_RESPONSE' });
      return saveFailed(session);
    }
    if (result.code === 'ALREADY_REVIEWED') {
      return sessionJson({ ok: false, code: result.code, error: 'الطلب اتراجع بالفعل بقرار مختلف. حدّث الصفحة لعرض حالته الحالية.' }, session, 409);
    }
    if (result.code === 'NOT_FOUND') {
      return sessionJson({ ok: false, code: result.code, error: 'الطلب لم يعد موجودًا. حدّث الصفحة لعرض الطلبات الحالية.' }, session, 404);
    }
    if (result.ok !== true || result.id?.toLowerCase() !== body.id.toLowerCase() || result.status !== body.status) {
      console.error('owner_activity_review_failed', { code: 'UNEXPECTED_RESULT' });
      return saveFailed(session);
    }
    return sessionJson({ ok: true, status: result.status }, session);
  } catch {
    console.error('owner_activity_review_failed', { code: 'REQUEST_FAILED' });
    return saveFailed(session);
  }
}
