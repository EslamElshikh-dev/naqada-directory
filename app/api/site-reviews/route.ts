import { NextResponse } from 'next/server';
import { resolveSession, sessionJson, type ResolvedSession } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders, sameOrigin } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  author_name: string;
  author_bio: string | null;
  created_at: string;
  updated_at: string;
  is_own: boolean;
};

type SummaryRow = { review_count: number | string; average_rating: number | string };

function mapReview(row: ReviewRow) {
  return {
    id: row.id,
    rating: Number(row.rating),
    body: row.body,
    authorName: row.author_name,
    authorBio: row.author_bio || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    own: Boolean(row.is_own),
  };
}

async function readRows(session: ResolvedSession | null) {
  const token = session?.accessToken;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_site_reviews`, {
    method: 'POST',
    headers: restHeaders(token, true),
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('REVIEWS_READ_FAILED');
  return response.json() as Promise<ReviewRow[]>;
}

async function readSummary(session: ResolvedSession | null) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_site_review_summary`, {
    method: 'POST',
    headers: restHeaders(session?.accessToken, true),
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('REVIEWS_SUMMARY_FAILED');
  const rows = await response.json() as SummaryRow[];
  return {
    count: Number(rows[0]?.review_count || 0),
    average: Number(rows[0]?.average_rating || 0),
  };
}

export async function GET() {
  const session = await resolveSession();
  try {
    const [rows, summary] = await Promise.all([readRows(session), readSummary(session)]);
    const own = session ? rows.find((row) => row.is_own) || null : null;
    return sessionJson({
      authenticated: Boolean(session),
      emailVerified: Boolean(session?.user.emailVerified),
      summary,
      reviews: rows.slice(0, 8).map(mapReview),
      myReview: own ? mapReview(own) : null,
    }, session);
  } catch {
    return sessionJson({ error: 'تعذر تحميل تقييمات الدليل الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.user.emailVerified) return sessionJson({ error: 'أكد بريدك الإلكتروني أولًا قبل نشر التقييم.' }, session, 403);
  const body = await request.json().catch(() => ({}));
  const rating = Number(body?.rating);
  const review = typeof body?.review === 'string' ? body.review.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return sessionJson({ error: 'اختر تقييمًا من نجمة إلى خمس نجوم.' }, session, 400);
  if (review.length < 20 || review.length > 800) return sessionJson({ error: 'اكتب رأيك في 20 إلى 800 حرف.' }, session, 400);
  try {
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/member_profiles?id=eq.${encodeURIComponent(session.user.id)}&select=full_name,bio&limit=1`,
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    const profiles = profileResponse.ok ? await profileResponse.json() as Array<{ full_name: string; bio: string | null }> : [];
    const author = profiles[0];
    const response = await fetch(`${SUPABASE_URL}/rest/v1/site_reviews?on_conflict=user_id`, {
      method: 'POST',
      headers: { ...restHeaders(session.accessToken, true), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: session.user.id,
        rating,
        body: review,
        author_name: (author?.full_name || session.user.displayName).slice(0, 80),
        status: 'published',
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('REVIEW_WRITE_FAILED');
    const rows = await response.json() as ReviewRow[];
    return sessionJson({ saved: true, review: rows[0] ? { ...mapReview({ ...rows[0], author_bio: author?.bio || null, is_own: true }), own: true } : null }, session);
  } catch {
    return sessionJson({ error: 'تعذر حفظ تقييمك الآن.' }, session, 500);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/site_reviews?user_id=eq.${encodeURIComponent(session.user.id)}`, {
    method: 'DELETE',
    headers: restHeaders(session.accessToken),
    cache: 'no-store',
  });
  return response.ok
    ? sessionJson({ deleted: true }, session)
    : sessionJson({ error: 'تعذر حذف تقييمك الآن.' }, session, 500);
}
