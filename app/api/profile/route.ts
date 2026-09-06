import { NextResponse } from 'next/server';
import { localities } from '@/lib/data';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders, sameOrigin, updateUserName } from '@/lib/auth/supabase-rest';
import { resolveMemberReputation, type MemberFrameCode, type MemberRoleOverride } from '@/lib/member-reputation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProfileRow = {
  full_name: string;
  phone: string | null;
  locality: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type RoleRow = {
  role_code: string;
  role_label: string;
  frame_code: MemberFrameCode;
};

type ContributionRow = { status: string };

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

async function readProfile(accessToken: string, id: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/member_profiles?id=eq.${encodeURIComponent(id)}&select=full_name,phone,locality,bio,avatar_url,created_at,updated_at&limit=1`,
    { headers: restHeaders(accessToken), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('PROFILE_READ_FAILED');
  const rows = await response.json() as ProfileRow[];
  return rows[0] || null;
}

async function readRole(accessToken: string, id: string): Promise<MemberRoleOverride> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_member_roles?user_id=eq.${encodeURIComponent(id)}&active=eq.true&select=role_code,role_label,frame_code&limit=1`,
    { headers: restHeaders(accessToken), cache: 'no-store' },
  );
  if (!response.ok) return null;
  const rows = await response.json() as RoleRow[];
  const row = rows[0];
  return row ? { roleCode: row.role_code, roleLabel: row.role_label, frameCode: row.frame_code } : null;
}

async function readContributionStatuses(accessToken: string, id: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_contributions?submitted_by_user_id=eq.${encodeURIComponent(id)}&select=status&limit=5000`,
    { headers: restHeaders(accessToken), cache: 'no-store' },
  );
  if (!response.ok) return [];
  const rows = await response.json() as ContributionRow[];
  return rows.map((item) => item.status);
}

async function serialize(profile: ProfileRow | null, session: NonNullable<Awaited<ReturnType<typeof resolveSession>>>) {
  const createdAt = profile?.created_at || session.user.createdAt;
  const [role, statuses] = await Promise.all([
    readRole(session.accessToken, session.user.id),
    readContributionStatuses(session.accessToken, session.user.id),
  ]);
  return {
    fullName: profile?.full_name || session.user.displayName,
    email: session.user.email,
    phone: profile?.phone || '',
    locality: profile?.locality || '',
    bio: profile?.bio || '',
    avatarUrl: profile?.avatar_url || session.user.avatarUrl,
    createdAt,
    updatedAt: profile?.updated_at || null,
    reputation: resolveMemberReputation({ createdAt, statuses, role }),
  };
}

export async function GET() {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  try {
    return sessionJson({ profile: await serialize(await readProfile(session.accessToken, session.user.id), session) }, session);
  } catch {
    return sessionJson({ error: 'تعذر تحميل الملف الشخصي الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const fullName = clean(body?.fullName, 80);
  const phone = clean(body?.phone, 20).replace(/[\s()\-]/g, '');
  const locality = clean(body?.locality, 100);
  const bio = clean(body?.bio, 280);
  if (fullName.length < 2) return sessionJson({ error: 'اكتب الاسم الكامل بشكل صحيح.' }, session, 400);
  if (phone && !/^\+?\d{7,15}$/.test(phone)) return sessionJson({ error: 'رقم الهاتف غير صحيح.' }, session, 400);
  if (locality && !new Set(localities.map((item) => item.name)).has(locality)) {
    return sessionJson({ error: 'اختر قرية أو موضعًا من قائمة دليل نقادة.' }, session, 400);
  }
  try {
    await updateUserName(session.accessToken, fullName);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/member_profiles?on_conflict=id`, {
      method: 'POST',
      headers: { ...restHeaders(session.accessToken, true), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        id: session.user.id,
        full_name: fullName,
        phone: phone || null,
        locality: locality || null,
        bio: bio || null,
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('PROFILE_WRITE_FAILED');
    const rows = await response.json() as ProfileRow[];
    const nextSession = { ...session, user: { ...session.user, displayName: fullName } };
    return sessionJson({ saved: true, profile: await serialize(rows[0] || null, nextSession) }, nextSession);
  } catch {
    return sessionJson({ error: 'تعذر حفظ الملف الشخصي الآن.' }, session, 500);
  }
}
