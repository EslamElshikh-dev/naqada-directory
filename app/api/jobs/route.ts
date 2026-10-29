import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/jobs';
import { localities } from '@/lib/data';
import { buildJobHeadlines } from '@/lib/job-headlines';
import { sameOrigin, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
// GET uses the explicit CDN policy below. force-static also empties POST headers
// in Next and would bypass the existing Origin check on the submission handler.
export const revalidate = 300;

export async function GET() {
  const { jobs, state, available } = await getJobs();
  const naqadaPlaces = new Set(['مركز نقادة', 'مدينة نقادة', ...localities.map((place) => place.name)]);
  return NextResponse.json({
    items: buildJobHeadlines(jobs, naqadaPlaces),
    checkedAt: state?.last_checked_at || null,
    available,
  }, { status: available ? 200 : 503, headers: { 'Cache-Control': available ? 'public, s-maxage=300, stale-while-revalidate=3600' : 'no-store' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'origin_not_allowed' }, { status: 403 });
  const data = await request.json().catch(() => null);
  if (!data || typeof data !== 'object') return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const upstream = await fetch(`${SUPABASE_URL}/functions/v1/naqada-jobs`, {
    method: 'POST', cache: 'no-store', headers: {
      'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY,
      Origin: request.headers.get('origin') || new URL(request.url).origin,
      'X-Forwarded-For': (request.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown',
    }, body: JSON.stringify(data),
  }).catch(() => null);
  if (!upstream) return NextResponse.json({ ok: false, error: 'network_error' }, { status: 502 });
  return NextResponse.json(await upstream.json().catch(() => ({ ok: false, error: 'invalid_response' })), { status: upstream.status });
}
