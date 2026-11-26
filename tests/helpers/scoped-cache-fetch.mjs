// Local production-server QA only. All outbound fetches are intercepted: no
// synthetic mutation or read is sent to Supabase, publishers, or production.
import fs from 'node:fs';
const nativeFetch = globalThis.fetch;
const delayed = new Set();
globalThis.fetch = async function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return nativeFetch(input, init);
  const fixture = JSON.parse(fs.readFileSync(process.env.NAQADA_CACHE_FIXTURE, 'utf8'));
  fs.appendFileSync(process.env.NAQADA_CACHE_READS, JSON.stringify({ path: url.pathname, query: url.search, body: init?.body }) + '\n');
  if (url.pathname.endsWith('/rpc/get_public_naqada_content')) {
    return Response.json(fixture.curated?.[JSON.parse(init.body).p_kind] || []);
  }
  if (url.pathname.endsWith('/naqada_jobs')) {
    return Response.json((fixture.jobs || []).filter(job => 'eq.' + job.kind === url.searchParams.get('kind')));
  }
  if (url.pathname.endsWith('/naqada_job_feed_state')) return Response.json([{ last_checked_at: '2026-11-12T00:00:00Z', successful_feeds: 1, latest_added: fixture.jobs?.length || 0 }]);
  if (url.pathname.endsWith('/directory_owner_listings')) return Response.json(fixture.owners || []);
  if (url.pathname.endsWith('/naqada_news_archive')) {
    const idFilter = url.searchParams.get('id');
    const id = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null;
    let rows = fixture.archive || [];
    if (id) rows = rows.filter(item => item.id === id);
    if (idFilter?.startsWith('in.(')) rows = rows.filter(item => idFilter.slice(4,-1).split(',').includes(item.id));
    const before = url.searchParams.get('published_at');
    if (before?.startsWith('lte.')) rows = rows.filter(item => Date.parse(item.publishedAt) <= Date.parse(before.slice(4)));
    rows = [...rows].sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
    const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || rows.length);
    const response = Response.json(rows.slice(offset,offset+limit).map(payload => ({ payload })));
    if (id && fixture.delay?.id === id && !delayed.has(fixture.delay.key)) {
      delayed.add(fixture.delay.key); await new Promise(resolve => setTimeout(resolve,fixture.delay.ms));
    }
    return response;
  }
  if (url.pathname.includes('/rest/v1/')) return Response.json([]);
  return new Response('Isolated QA: upstream unavailable', { status: 503 });
};
