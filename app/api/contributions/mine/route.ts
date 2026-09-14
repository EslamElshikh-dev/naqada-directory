import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type OwnContributionRow = {
  id: string;
  request_type: 'add' | 'correction' | 'missing';
  name: string;
  status: 'pending' | 'reviewing' | 'needs_info' | 'approved' | 'rejected' | 'published';
  review_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  const query = new URLSearchParams({
    submitted_by_user_id: `eq.${session.user.id}`,
    select: 'id,request_type,name,status,review_message,created_at,updated_at',
    order: 'created_at.desc',
    limit: '12',
  });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/directory_contributions?${query.toString()}`, {
      headers: restHeaders(session.accessToken),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('CONTRIBUTIONS_READ_FAILED');
    const rows = await response.json() as OwnContributionRow[];
    return sessionJson({
      contributions: rows.map((row) => ({
        id: row.id,
        requestType: row.request_type,
        name: row.name,
        status: row.status,
        reviewMessage: row.review_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    }, session);
  } catch {
    return sessionJson({ error: 'تعذر تحميل حالات المساهمات الآن.', contributions: [] }, session, 500);
  }
}
