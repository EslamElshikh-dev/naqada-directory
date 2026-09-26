import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { businesses, categories, localities } from '@/lib/data';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { getLatestNews } from '@/lib/news';
import { canModerate, callModeratorAction, type CuratedKind } from '@/lib/auth/moderator';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { sameOrigin } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const limits: Record<string, number> = {
  title: 160, summary: 500, body: 8000, category: 120, locality: 160,
  phone: 20, address: 240, hours: 180, sourceUrl: 500, source: 100, imageUrl: 500,
};

function payloadFrom(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const original = value as Record<string, unknown>;
  if (Object.keys(original).some((key) => !(key in limits))) return null;
  const result: Record<string, string> = {};
  for (const [key, maximum] of Object.entries(limits)) {
    const field = original[key];
    if (field !== undefined && typeof field !== 'string') return null;
    result[key] = (field || '').trim().slice(0, maximum);
  }
  for (const key of ['sourceUrl', 'imageUrl']) {
    if (result[key] && (!/^https:\/\//i.test(result[key]) || !URL.canParse(result[key]))) return null;
  }
  if (result.phone && !/^\+?\d{10,15}$/.test(result.phone)) return null;
  return result;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) {
    return NextResponse.json({ error: 'هذه المساحة للمشرفين فقط.' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return sessionJson({ error: 'طلب غير صالح.' }, session, 400);

  try {
    if (body.type === 'member') {
      if (!uuid.test(body.id) || !['suspend', 'remove', 'restore'].includes(body.action)) throw Error('BAD_INPUT');
      const untilDate = body.action === 'suspend' ? new Date(body.until) : null;
      if (untilDate && !Number.isFinite(untilDate.getTime())) throw Error('BAD_INPUT');
      const until = untilDate?.toISOString() || null;
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
      await callModeratorAction(session.accessToken, 'moderate_naqada_member', {
        p_user_id: body.id, p_action: body.action, p_until: until, p_reason: reason,
      });
    } else if (body.type === 'submission') {
      const valid: Record<string, string[]> = {
        business: ['pending','published','rejected'],
        contribution: ['reviewing','needs_info','approved','rejected'],
        review: ['published','hidden'],
      };
      if (!uuid.test(body.id) || !valid[body.kind]?.includes(body.status)) throw Error('BAD_INPUT');
      const patch = body.patch && typeof body.patch === 'object' && !Array.isArray(body.patch) ? body.patch : {};
      const allowed = body.kind === 'business'
        ? ['name','phone','hours','address','description','category','locality']
        : body.kind === 'contribution' ? ['name','category','locality','details','notes'] : [];
      if (Object.keys(patch).some((key) => !allowed.includes(key) || typeof patch[key] !== 'string')) throw Error('BAD_INPUT');
      if (JSON.stringify(patch).length > 6000) throw Error('BAD_INPUT');
      await callModeratorAction(session.accessToken, 'moderate_naqada_submission', {
        p_kind: body.kind, p_id: body.id, p_status: body.status, p_patch: patch,
      });
    } else if (body.type === 'content') {
      const kind = body.kind as CuratedKind;
      const origin = body.origin;
      const status = body.status;
      const payload = payloadFrom(body.payload);
      if (!['business','news','article'].includes(kind) || !['static','original'].includes(origin)
        || !['draft','published','hidden'].includes(status) || !payload) throw Error('BAD_INPUT');
      let slug = typeof body.slug === 'string' ? body.slug : '';
      if (origin === 'original') {
        if (slug && !/^editor-[0-9a-f-]{36}$/i.test(slug)) throw Error('BAD_INPUT');
        if (!slug) slug = `editor-${randomUUID()}`;
      } else {
        const exists = kind === 'business' ? businesses.some((item) => item.slug === slug)
          : kind === 'article' ? allEditorialPosts.some((item) => item.slug === slug)
            : (await getLatestNews()).items.some((item) => item.id === slug && !item.isOriginal);
        if (!exists) throw Error('BAD_INPUT');
      }
      if (status === 'published' && (payload.title.length < 3 || payload.summary.length < 15
        || (origin === 'original' && kind !== 'business' && payload.body.length < 40)
        || (kind === 'business' && origin === 'original'
          && (!categories.some((c) => c.name === payload.category)
            || !localities.some((l) => l.name === payload.locality))))) throw Error('BAD_INPUT');
      await callModeratorAction(session.accessToken, 'save_naqada_editor_content', {
        p_kind: kind, p_slug: slug, p_origin: origin, p_status: status, p_payload: payload,
      });
      return sessionJson({ ok: true, slug }, session);
    } else throw Error('BAD_INPUT');
    return sessionJson({ ok: true }, session);
  } catch (error) {
    return sessionJson({
      error: error instanceof Error && error.message === 'BAD_INPUT'
        ? 'راجع البيانات والحقول المطلوبة قبل الحفظ.'
        : 'تعذّر تنفيذ الإجراء. راجع الصلاحيات والبيانات وحاول مرة أخرى.',
    }, session, error instanceof Error && error.message === 'BAD_INPUT' ? 400 : 502);
  }
}
