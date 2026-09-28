import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE = 'https://naqada-directory.vercel.app';
const PUBLIC_KEY = 'sb_publishable_QsT7jYGw7sWx0v6Vbg2Vjw_-uFV8wMk';

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST' || request.headers.get('origin') || request.headers.get('apikey') !== PUBLIC_KEY) {
    return Response.json({ ok: false }, { status: 403 });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return Response.json({ ok: false }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: claimed, error: claimError } = await db.rpc('claim_naqada_news_refresh');
  if (claimError) return Response.json({ ok: false, error: 'lock_unavailable' }, { status: 503 });
  if (!claimed) return Response.json({ ok: true, skipped: true });
  try {
    const response = await fetch(`${SITE}/api/news/feed/`, { signal: AbortSignal.timeout(18000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('feed_unavailable');
    const feed = await response.json() as { items: Array<Record<string, unknown>>; successfulFeeds: number };
    if (!Array.isArray(feed.items) || !feed.successfulFeeds) throw new Error('no_sources_available');
    const rows = feed.items.slice(0, 120).flatMap(item => {
      if (typeof item.id !== 'string' || !/^[a-z0-9-]{3,90}$/i.test(item.id)
        || typeof item.url !== 'string' || !item.url.startsWith('https://')
        || typeof item.title !== 'string' || !item.title || item.isOriginal) return [];
      const date = typeof item.publishedAt === 'string' ? Date.parse(item.publishedAt) : NaN;
      return [{ id: item.id, url: item.url, payload: item,
        published_at: Number.isFinite(date) ? new Date(date).toISOString() : new Date().toISOString() }];
    });
    if (rows.length) {
      const { error } = await db.from('naqada_news_archive').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    }
    return Response.json({ ok: true, received: rows.length });
  } catch (error) {
    // A failed feed may be retried immediately instead of waiting for the lock.
    await db.from('naqada_news_refresh_lock').delete().eq('name', 'feed');
    return Response.json({ ok: false, error: String(error) }, { status: 503 });
  }
});
