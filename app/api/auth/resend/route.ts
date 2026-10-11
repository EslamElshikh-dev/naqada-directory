import { NextResponse } from 'next/server';
import { resendConfirmation, sameOrigin, SupabaseAuthError } from '@/lib/auth/supabase-rest';
import { siteConfig } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'اكتب بريدك الإلكتروني أولًا.' }, { status: 400, headers });
  try {
    await resendConfirmation(email, `${siteConfig.url}/account/login?confirmed=1`);
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    const limited = error instanceof SupabaseAuthError && (error.status === 429 || /rate|over_email_send_rate_limit/.test(error.code));
    return NextResponse.json({ error: limited ? 'انتظر دقيقة قبل طلب رسالة أخرى.' : 'تعذر إعادة إرسال التأكيد. حاول بعد قليل أو راجع البريد المكتوب.' }, { status: limited ? 429 : 400, headers });
  }
}
