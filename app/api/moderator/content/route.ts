import { NextResponse } from 'next/server';
import { businesses } from '@/lib/data';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { getLatestNews } from '@/lib/news';
import { canModerate, type CuratedKind } from '@/lib/auth/moderator';
import { resolveSession, sessionJson } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session || !(await canModerate(session.accessToken))) {
    return NextResponse.json({ error: 'هذه المساحة للمشرفين فقط.' }, { status: 403 });
  }
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') as CuratedKind;
  const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('ar-EG').slice(0, 80);
  if (!['business', 'news', 'article'].includes(kind)) {
    return sessionJson({ error: 'اختر قسمًا صحيحًا.' }, session, 400);
  }
  try {
    const items = kind === 'business'
      ? businesses.filter((item) => !query || `${item.name} ${item.locality} ${item.category}`.toLocaleLowerCase('ar-EG').includes(query))
        .slice(0, 25).map((item) => ({
          slug: item.slug, title: item.name, summary: item.description || item.notes || item.address || '',
          category: item.category, locality: item.locality || '', phone: item.phone || '',
          address: item.address || '', hours: item.hours || '',
        }))
      : kind === 'article'
        ? allEditorialPosts.filter((item) => !query || `${item.title} ${item.locality}`.toLocaleLowerCase('ar-EG').includes(query))
          .slice(0, 25).map((item) => ({
            slug: item.slug, title: item.title, summary: item.description, body: '',
            category: item.category, locality: item.locality,
          }))
        : (await getLatestNews()).items.filter((item) => !item.isOriginal && (!query || item.title.toLocaleLowerCase('ar-EG').includes(query)))
          .slice(0, 25).map((item) => ({
            slug: item.id, title: item.title, summary: item.description, category: item.category,
            sourceUrl: item.url, source: item.source,
          }));
    return sessionJson({ items }, session);
  } catch {
    return sessionJson({ error: 'تعذّر تحميل السجلات الآن.' }, session, 502);
  }
}
