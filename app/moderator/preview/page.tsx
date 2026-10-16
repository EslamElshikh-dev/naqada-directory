import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { resolveSession } from '@/lib/auth/session';
import { canModerate } from '@/lib/auth/moderator';
import { getEditorArticle } from '@/lib/article-content';
import type { ArticleKind } from '@/lib/article-document';
import { EditorialPostArticle } from '@/app/blog/[slug]/article-view';
import { RoleModelStory } from '@/app/role-models/[slug]/story-view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'معاينة المقال', robots: { index: false, follow: false }, alternates: { canonical: '/moderator/' } };

export default async function ArticlePreview({ searchParams }: { searchParams: Promise<{ kind?: string; slug?: string }> }) {
  const session = await resolveSession();
  if (!session) redirect('/account/login?next=/moderator');
  if (!(await canModerate(session.accessToken))) notFound();
  const params = await searchParams;
  if (!['article', 'role_model'].includes(params.kind || '') || !params.slug) notFound();
  const result = await getEditorArticle(session.accessToken, params.kind as ArticleKind, params.slug);
  if (!result) notFound();
  const doc = result.document;
  return <><div role="status" style={{ padding: '16px', background: '#fff1cc', color: '#49380f', textAlign: 'center' }}>معاينة خاصة للمسودة المحفوظة — لا تظهر للزوار قبل النشر.</div>{doc.format === 'editorial' ? <EditorialPostArticle post={doc.content} /> : <RoleModelStory person={doc.content} />}</>;
}
