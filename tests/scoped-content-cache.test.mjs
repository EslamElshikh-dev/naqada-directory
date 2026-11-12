import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { timingSafeEqual } from 'node:crypto';
import ts from 'typescript';

function load(path, modules, globals = {}) {
  const record = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module: record, exports: record.exports, require: name => modules[name],
    AbortSignal, Response, Date, Buffer, console, ...globals });
  return record.exports;
}

function harness() {
  const values = new Map(), registrations = [], invalidations = [], paths = [], afters = [], delays = [];
  const nextCache = {
    unstable_cache(fn, keys, options) {
      registrations.push({ keys, options });
      return async (...args) => {
        const key = JSON.stringify([keys, args]);
        if (values.has(key)) return values.get(key).value;
        const value = await fn(...args);
        // Deliberately model a late in-flight write after an invalidation. The
        // delayed webhook purge, not this mock, has to remove that old snapshot.
        values.set(key, { value, tags: options.tags });
        return value;
      };
    },
    revalidateTag(tag, profile) {
      invalidations.push({ tag, profile });
      for (const [key, entry] of values) if (entry.tags.includes(tag)) values.delete(key);
    },
    revalidatePath(path, type) { paths.push({ path, type }); },
  };
  const publicCache = load('../lib/public-content-cache.ts', { 'next/cache': nextCache });
  const api = load('../app/api/revalidate/route.ts', {
    'next/server': { after: fn => afters.push(fn) },
    'node:crypto': { timingSafeEqual },
    '@/lib/public-content-cache': publicCache,
  }, {
    process: { env: { CONTENT_REVALIDATION_SECRET: 'synthetic-test-secret-with-at-least-32-characters' } },
    setTimeout: (fn, ms) => { delays.push(ms); fn(); },
  });
  const post = (body, authorized = true) => api.POST(new Request('https://directory.invalid/api/revalidate', {
    method: 'POST', headers: { authorization: authorized ? 'Bearer synthetic-test-secret-with-at-least-32-characters' : 'Bearer invalid' },
    body: JSON.stringify(body),
  }));
  return { nextCache, publicCache, api, post, values, registrations, invalidations, paths, afters, delays };
}

function readers(h, read) {
  const modules = {
    react: { cache: fn => fn }, 'next/cache': h.nextCache,
    '@/lib/public-content-cache': h.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://database.invalid', restHeaders: () => ({}), SupabaseAuthError: Error },
    '@/lib/owner-listing-photo': {}, '@/lib/owner-listing-copy': { publicOwnerCopy: row => row },
  };
  return {
    jobs: load('../lib/jobs.ts', modules, { fetch: read }),
    owners: load('../lib/owner-listings.ts', modules, { fetch: read }),
    curated: load('../lib/auth/moderator.ts', modules, { fetch: read }),
  };
}

const job = { id: 'job-1', published_at: '2026-01-01', expires_at: '2099-01-01' };

test('new jobs and withdrawals refresh jobs without rereading directory, articles, or news', async () => {
  const h = harness(), calls = [];
  let jobs = [];
  const r = readers(h, async (url, init) => {
    calls.push(url + (init.body || ''));
    if (url.includes('kind=eq.offer')) return Response.json(jobs);
    if (url.includes('get_public_naqada_content')) return Response.json([{ slug: JSON.parse(init.body).p_kind }]);
    return Response.json([]);
  });
  const unrelated = async () => Promise.all([r.owners.getPublishedOwnerListings(), ...['business', 'news', 'article', 'role_model'].map(kind => r.curated.getPublicCurated(kind))]);
  await unrelated();
  assert.equal((await r.jobs.getJobs()).jobs.length, 0);
  const unrelatedCalls = calls.filter(call => !call.includes('naqada_job')).length;
  jobs = [job];
  assert.equal((await h.post({ scopes: ['jobs'] })).status, 200);
  assert.equal((await r.jobs.getJobs()).jobs.length, 1);
  await unrelated();
  assert.equal(calls.filter(call => !call.includes('naqada_job')).length, unrelatedCalls);
  jobs = [];
  await h.post({ scopes: ['jobs'] });
  assert.equal((await r.jobs.getJobs()).jobs.length, 0);
  assert.deepEqual(h.paths, [{ path: '/api/jobs', type: undefined }, { path: '/api/jobs', type: undefined }]);
  assert.ok(h.invalidations.every(item => item.tag === 'naqada-public-content:jobs' && item.profile.expire === 0));
});

test('empty/invalid webhook scopes do not purge content; legacy payload stays compatible', async () => {
  const h = harness();
  assert.equal((await h.post({ scopes: ['jobs'] }, false)).status, 401);
  for (const body of [null, [], { scopes: 'jobs' }, { scopes: ['unknown'] }, { scopes: ['jobs', null] }]) {
    assert.equal((await h.post(body)).status, 400);
  }
  assert.equal((await (await h.post({ scopes: [] })).json()).revalidated, false);
  assert.equal(h.invalidations.length, 0);
  assert.equal(h.afters.length, 0);
  const legacy = await h.post({ source: 'supabase', version: 23 });
  assert.equal(legacy.status, 200);
  assert.equal(h.invalidations.length, h.publicCache.PUBLIC_CONTENT_SCOPES.length);
  assert.ok(!h.paths.some(item => item.path === '/' || item.type === 'layout'));
});

test('a late pre-withdrawal owner read is cleared by the delayed scoped purge', async () => {
  const h = harness();
  let hidden = false, release, startedRead;
  const started = new Promise(resolve => { startedRead = resolve; });
  const r = readers(h, async url => {
    if (url.includes('get_public_naqada_content')) return Response.json([{ slug: 'unrelated-news' }]);
    if (!hidden) return new Promise(resolve => { release = () => resolve(Response.json([{ id: 'withdrawn' }])); startedRead(); });
    return Response.json([]);
  });
  await r.curated.getPublicCurated('news');
  const earlier = r.owners.getPublishedOwnerListings();
  await started;
  hidden = true;
  await h.post({ scopes: ['owner-listings'] });
  assert.equal((await r.owners.getPublishedOwnerListings()).length, 0);
  release();
  assert.equal((await earlier).length, 1);
  // This intentionally stale late write is why the second purge remains.
  assert.equal((await r.owners.getPublishedOwnerListings()).length, 1);
  await h.afters[0]();
  assert.equal((await r.owners.getPublishedOwnerListings()).length, 0);
  assert.equal(await r.owners.getPublishedOwnerListing('withdrawn'), null);
  assert.deepEqual(h.delays, [Math.max(20000, h.publicCache.PUBLIC_READ_TIMEOUT_MS * 2 + 2000)]);
  assert.ok(h.invalidations.every(item => item.tag === 'naqada-public-content:owner-listings'));
  assert.ok([...h.values.values()].some(entry => entry.tags.includes('naqada-public-content:news')));
});

test('moderation chooses the changed content kind and does not invalidate on failed writes', async () => {
  const h = harness();
  let fail = false;
  const r = readers(h, async () => fail ? new Response('{}', { status: 503 }) : Response.json(true));
  await r.curated.callModeratorAction('editor', 'save_naqada_article_document', { p_kind: 'article' });
  await r.curated.callModeratorAction('editor', 'moderate_naqada_submission', { p_kind: 'business' });
  await r.curated.callModeratorAction('editor', 'moderate_naqada_submission', { p_kind: 'contribution' });
  assert.deepEqual(h.invalidations.map(item => item.tag), ['naqada-public-content:article', 'naqada-public-content:owner-listings']);
  fail = true;
  await assert.rejects(r.curated.callModeratorAction('editor', 'save_naqada_editor_content', { p_kind: 'news' }));
  assert.equal(h.invalidations.length, 2);
});

test('feed status uses its own bounded cache and a failure cannot hide available jobs', async () => {
  const h = harness();
  const r = readers(h, async url => {
    if (url.includes('naqada_job_feed_state')) return new Response('{}', { status: 503 });
    return Response.json(url.includes('kind=eq.offer') ? [job] : []);
  });
  const data = await r.jobs.getJobs();
  assert.equal(data.available, true);
  assert.equal(data.state, null);
  assert.equal(data.jobs.length, 1);
  assert.equal(h.registrations.find(item => item.keys[0] === 'job-feed-state-v1').options.revalidate, 1800);
  assert.equal(h.registrations.find(item => item.keys[0] === 'public-jobs-v3').options.revalidate, 3600);
});

test('archive changes use a distinct explicit tag from news sources and curated visibility', () => {
  const h = harness();
  const news = readFileSync(new URL('../lib/news.ts', import.meta.url), 'utf8');
  assert.match(news, /tags: \['naqada-news-sources'\]/);
  assert.match(news, /tags: \[publicContentTag\('news-archive'\)\]/);
  h.publicCache.invalidatePublicContent(['news-archive']);
  assert.deepEqual(h.invalidations.map(item => item.tag), ['naqada-public-content:news-archive']);
  assert.deepEqual(h.paths, [{ path: '/api/news', type: undefined }]);
});


test('legacy authenticated empty-body webhooks retain full invalidation compatibility', async () => {
  const h = harness();
  const response = await h.post(undefined);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revalidated, true);
  assert.equal(h.invalidations.length, h.publicCache.PUBLIC_CONTENT_SCOPES.length);
  assert.equal(h.afters.length, 1);
});
