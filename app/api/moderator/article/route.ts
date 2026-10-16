import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolveSession, sessionJson } from '@/lib/auth/session';
import { sameOrigin } from '@/lib/auth/supabase-rest';
import { canModerate, callModeratorAction } from '@/lib/auth/moderator';
import { getEditorArticle } from '@/lib/article-content';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { roleModels } from '@/lib/role-models';
import { articleTitle, articleSummary, validateArticleDocument, type ArticleKind } from '@/lib/article-document';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) return NextResponse.json({ error: 'هذه المساحة للمشرفين فقط.' }, { status: 403 });
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') as ArticleKind;
  if (!['article', 'role_model'].includes(kind)) return sessionJson({ error: 'نوع المقال غير صحيح.' }, session, 400);
  const result = await getEditorArticle(session.accessToken, kind, url.searchParams.get('slug') || undefined, session.user.displayName);
  return result ? sessionJson(result, session) : sessionJson({ error: 'المقال غير موجود.' }, session, 404);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) return NextResponse.json({ error: 'هذه المساحة للمشرفين فقط.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 600000) return sessionJson({ error: 'حجم المقال كبير جدًا.' }, session, 413);
  const raw = await request.text();
  if (raw.length > 300000) return sessionJson({ error: 'حجم المقال كبير جدًا.' }, session, 413);
  const body = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  if (!body || !['article', 'role_model'].includes(body.kind) || !['static', 'original'].includes(body.origin) || !['draft', 'published', 'hidden'].includes(body.status)) return sessionJson({ error: 'بيانات المقال غير صالحة.' }, session, 400);
  const kind = body.kind as ArticleKind;
  let slug = typeof body.slug === 'string' ? body.slug : '';
  if (body.origin === 'static') {
    const exists = kind === 'article' ? allEditorialPosts.some(p => p.slug === slug) : roleModels.some(p => p.slug === slug);
    if (!exists) return sessionJson({ error: 'المقال غير موجود.' }, session, 404);
  } else {
    if (slug && !/^editor-[0-9a-f-]{36}$/i.test(slug)) return sessionJson({ error: 'رابط المقال غير صحيح.' }, session, 400);
    if (!slug) slug = `editor-${randomUUID()}`;
  }
  if (body.version !== null && body.version !== undefined && (typeof body.version !== 'string' || !Number.isFinite(Date.parse(body.version)))) return sessionJson({ error: 'نسخة المقال غير صالحة. حدّثي الصفحة.' }, session, 400);
  let document;
  try { document = validateArticleDocument(body.document, kind, slug, body.status === 'published'); }
  catch (error) { return sessionJson({ error: error instanceof Error ? error.message : 'راجعي بيانات المقال.' }, session, 400); }
  try {
    const result = await callModeratorAction(session.accessToken, 'save_naqada_article_document', {
      p_kind: kind, p_slug: slug, p_origin: body.origin, p_status: body.status,
      p_payload: { title: articleTitle(document), summary: articleSummary(document), document: JSON.stringify(document) },
      p_expected_version: body.version || null,
    }) as { version: string };
    return sessionJson({ ok: true, slug, version: result.version, document }, session);
  } catch (error) {
    const conflict = error instanceof Error && error.message === 'ARTICLE_CONFLICT';
    return sessionJson({ error: conflict ? 'المقال اتعدّل من جلسة تانية. انسخي تعديلاتك ثم أعيدي فتحه قبل الحفظ.' : 'تعذّر حفظ المقال. تعديلاتك ما زالت موجودة في المحرر.' }, session, conflict ? 409 : 502);
  }
}
