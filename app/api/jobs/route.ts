import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/jobs';
import { localities } from '@/lib/data';
import { sameOrigin, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { jobs, state, available } = await getJobs();
  const naqadaPlaces = new Set(['مركز نقادة', 'مدينة نقادة', ...localities.map((place) => place.name)]);
  const headlineJobs = [...jobs.filter((job) => job.kind === 'offer').slice(0, 4), ...jobs.filter((job) => job.kind === 'seeker').slice(0, 2)].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  return NextResponse.json({
    items: headlineJobs.map((job) => ({ tag: job.kind === 'seeker' ? 'باحث عن عمل' : naqadaPlaces.has(job.locality) ? 'شغل في نقادة' : 'فرص قنا', text: `${job.title} · ${job.locality}`, href: `/jobs#job-${job.id}` })),
    checkedAt: state?.last_checked_at || null,
    available,
  }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' } });
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
