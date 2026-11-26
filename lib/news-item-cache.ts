import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { SUPABASE_URL, restHeaders } from './auth/supabase-rest';
import type { CuratedRecord } from './auth/moderator';
import type { ExternalNewsItem } from './news';
import { localNewsBriefs } from './news-editorial';
import { isPublicNewsId, NEWS_ITEMS_TAG, newsItemTag, PUBLIC_CONTENT_TTL, retryPublicRead } from './public-content-cache';

export type NewsSnapshot = { archived: ExternalNewsItem | null; revision: CuratedRecord | null };

// These are anonymous public RPC results, never a session-bound editor read.
// Request deduplication has no shared Next cache tag: loading one revision must
// not attach the news-index tag to every individual article page.
const readRevisions = cache((): Promise<CuratedRecord[]> => retryPublicRead(async () => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_naqada_content`, {
    method: 'POST', headers: restHeaders(undefined, true), body: JSON.stringify({ p_kind: 'news' }),
    cache: 'no-store', signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw Object.assign(Error('PUBLIC_NEWS_REVISION_UNAVAILABLE'), { status: response.status });
  return response.json();
}, 'news-item-visibility'));

export const getNewsSnapshot = cache(async (id: string): Promise<NewsSnapshot> => {
  if (!isPublicNewsId(id)) return { archived: null, revision: null };
  return unstable_cache(() => retryPublicRead(async () => {
    const [response, revisions] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/naqada_news_archive?select=payload&id=eq.${encodeURIComponent(id)}&limit=1`, {
        headers: restHeaders(), cache: 'no-store', signal: AbortSignal.timeout(4000),
      }), readRevisions(),
    ]);
    if (!response.ok) throw Object.assign(Error('NEWS_ITEM_ARCHIVE_UNAVAILABLE'), { status: response.status });
    const rows = await response.json() as { payload: ExternalNewsItem }[];
    return { archived: rows[0]?.payload || null, revision: revisions.find(row => row.slug === id) || null };
  }, 'news-item'), ['public-news-item-v1', id], {
    revalidate: PUBLIC_CONTENT_TTL, tags: [NEWS_ITEMS_TAG, newsItemTag(id)],
  })();
});

export function projectNewsSnapshot({ archived, revision }: NewsSnapshot): ExternalNewsItem | null {
  if (revision?.status === 'hidden') return null;
  let item = archived;
  if (!item && revision?.origin === 'original' && revision.status === 'published') {
    const p = revision.payload;
    item = { id: revision.slug, title: p.title, description: p.summary,
      url: `/news/${revision.slug}`, source: 'دليل نقادة', sourceUrl: '/news', publishedAt: revision.updatedAt,
      imageUrl: null, imageAlt: p.title, category: (['محليات','خدمات','تعليم','صحة','مجتمع'].includes(p.category) ? p.category : 'محليات') as ExternalNewsItem['category'],
      isNaqada: true, isOfficial: false, isOriginal: true, editorialBody: p.body };
  }
  if (!item) return null;
  const copy = { ...item, publishedAt: Number.isFinite(Date.parse(item.publishedAt)) ? item.publishedAt : '' };
  if (revision?.status === 'published') return { ...copy, title: revision.payload.title || copy.title,
    description: revision.payload.summary || copy.description, editorialBody: revision.payload.body || localNewsBriefs[copy.id] };
  return copy.isOriginal ? copy : { ...copy, editorialBody: localNewsBriefs[copy.id] || copy.editorialBody };
}

// Related links are a per-story archive selection anchored to its publication
// time, rather than a dependency on the constantly changing latest-news feed.
// Chosen items are resolved separately below, so their own edits/hides still
// invalidate the page containing the link. All links remain in server HTML.
export async function getRelatedNewsItems(item: ExternalNewsItem): Promise<ExternalNewsItem[]> {
  if (!isPublicNewsId(item.id)) return [];
  const before = Number.isFinite(Date.parse(item.publishedAt)) ? new Date(item.publishedAt).toISOString() : '';
  try {
    const ids = await unstable_cache(async () => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/naqada_news_archive?select=payload&order=published_at.desc&limit=24${before ? `&published_at=lte.${encodeURIComponent(before)}` : ''}`, {
        headers: restHeaders(), cache: 'no-store', signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) throw Error('RELATED_NEWS_UNAVAILABLE');
      const rows = await response.json() as { payload: ExternalNewsItem }[];
      return [...new Set(rows.map(row => row.payload).filter(story => story?.id !== item.id && isPublicNewsId(story?.id) &&
        (story.category === item.category || story.isNaqada === item.isNaqada)).map(story => story.id))].slice(0, 6);
    }, ['related-news-items-v1', item.id, before, item.category, String(item.isNaqada)], {
      revalidate: PUBLIC_CONTENT_TTL, tags: [NEWS_ITEMS_TAG, newsItemTag(item.id)],
    })();
    const snapshots = await Promise.allSettled(ids.map(getNewsSnapshot));
    return snapshots.flatMap(result => {
      const story = result.status === 'fulfilled' ? projectNewsSnapshot(result.value) : null;
      return story && story.id !== item.id && (story.category === item.category || story.isNaqada === item.isNaqada) &&
        (!before || Date.parse(story.publishedAt) <= Date.parse(before)) ? [story] : [];
    }).slice(0, 3);
  } catch { return []; }
}
