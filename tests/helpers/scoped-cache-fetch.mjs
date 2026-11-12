// Local production-server QA only. All outbound fetches are intercepted: no
// synthetic mutation or read is sent to Supabase, publishers, or production.
import fs from 'node:fs';
const nativeFetch = globalThis.fetch;
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
  if (url.pathname.includes('/rest/v1/')) return Response.json([]);
  return new Response('Isolated QA: upstream unavailable', { status: 503 });
};
