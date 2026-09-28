import { answerSanad } from '@/lib/sanad';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Next.js can normalize request.url to localhost; Host retains the requested origin.
  const requestUrl = new URL(request.url);
  const host = request.headers.get('host');
  if (host) requestUrl.host = host;
  if (origin && origin !== requestUrl.origin) return Response.json({ error: 'طلب غير مسموح.' }, { status: 403, headers });
  if (Number(request.headers.get('content-length')) > 6000) return Response.json({ error: 'الرسالة طويلة جدًا.' }, { status: 413, headers });
  try {
    const raw = await request.text();
    if (raw.length > 6000) return Response.json({ error: 'الرسالة طويلة جدًا.' }, { status: 413, headers });
    const body = JSON.parse(raw);
    if (typeof body?.message !== 'string' || !body.message.trim() || body.message.length > 600 || (body.previousQuery !== undefined && (typeof body.previousQuery !== 'string' || body.previousQuery.length > 150))) return Response.json({ error: 'اكتب سؤالًا من 1 إلى 600 حرف.' }, { status: 400, headers });
    const answer = answerSanad(body.message.trim(), body.previousQuery || '');
    const cookieId = request.cookies.get('naqada_visitor')?.value || '';
    const visitorId = uuidPattern.test(cookieId) ? cookieId : randomUUID();
    if (visitorId !== cookieId) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_naqada_visit`, {
        method: 'POST', headers: restHeaders(undefined, true),
        body: JSON.stringify({ p_visitor_id: visitorId, p_path: '/', p_device_class: 'desktop' }),
        cache: 'no-store', signal: AbortSignal.timeout(2500),
      }).catch(() => null);
    }
    const outcome = answer.text.startsWith('ما لقيتش معلومة مطابقة') ? 'no_result' : 'answer';
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_naqada_sanad_interaction`, {
      method: 'POST', headers: restHeaders(undefined, true),
      body: JSON.stringify({ p_visitor_id: visitorId, p_question: body.message.trim(), p_answer: answer.text,
        p_outcome: outcome, p_card_titles: [] }),
      cache: 'no-store', signal: AbortSignal.timeout(2500),
    }).catch(() => null);
    const response = NextResponse.json(answer, { headers });
    if (visitorId !== cookieId) response.cookies.set('naqada_visitor', visitorId, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch { return Response.json({ error: 'تعذّر قراءة السؤال. جرّب مرة تانية.' }, { status: 400, headers }); }
}
