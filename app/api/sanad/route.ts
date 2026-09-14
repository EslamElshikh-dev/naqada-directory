import { answerSanad } from '@/lib/sanad';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
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
    return Response.json(answerSanad(body.message.trim(), body.previousQuery || ''), { headers });
  } catch { return Response.json({ error: 'تعذّر قراءة السؤال. جرّب مرة تانية.' }, { status: 400, headers }); }
}
