import { createHmac, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, modules) {
  const record = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module: record, exports: record.exports, require: name => modules[name],
    Response, Date, URL, AbortSignal, console });
  return record.exports;
}

for (const route of ['../app/api/news/route.ts', '../app/api/news/feed/route.ts']) {
  test(`${route}: explicit news cache policy is bounded and refreshed data can omit withdrawn items`, async () => {
    let items = [{ id: 'published', title: 'خبر منشور', source: 'المصدر', isOriginal: false }];
    const read = async () => ({ items, checkedAt: '2026-10-13T03:00:00Z', successfulFeeds: 1 });
    const api = load(route, { 'next/server': { NextResponse: Response }, '@/lib/news': { getLatestNews: read, getLiveNews: read } });
    const before = await api.GET();
    assert.equal(before.headers.get('cache-control'), route.endsWith('/feed/route.ts') ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=3600');
    assert.equal((await before.json()).items.length, 1);
    items = [];
    const after = await api.GET();
    assert.equal(after.headers.get('cache-control'), route.endsWith('/feed/route.ts') ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=3600');
    assert.equal((await after.json()).items.length, 0);
  });
}

test('job API does not cache a temporary failure or a withdrawn job at the CDN', async () => {
  let data = { jobs: [{ id: 'offer' }], state: null, available: true };
  const api = load('../app/api/jobs/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/jobs': { getJobs: async () => data },
    '@/lib/data': { localities: [] }, '@/lib/job-headlines': { buildJobHeadlines: jobs => jobs },
    '@/lib/auth/supabase-rest': {},
  });
  assert.equal((await (await api.GET()).json()).items.length, 1);
  data = { jobs: [], state: null, available: false };
  const failed = await api.GET();
  assert.equal(failed.headers.get('cache-control'), 'no-store');
  assert.equal((await failed.json()).available, false);
  data = { jobs: [], state: null, available: true };
  const recovered = await api.GET();
  assert.equal((await recovered.json()).items.length, 0);
});

test('public notifications share the bounded job data cache without pinning withdrawn offers', async () => {
  let jobs = [{ id: 'offer', kind: 'offer', published_at: new Date().toISOString(), title: 'وظيفة', locality: 'نقادة', field: 'مبيعات' }];
  const api = load('../app/api/notifications/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/data': { businesses: [] },
    '@/lib/editorial-posts-all': { allEditorialPosts: [] }, '@/lib/role-models': { roleModels: [] },
    '@/lib/jobs': { getJobs: async (...args) => { assert.equal(args.length, 0); return { jobs }; } },
  });
  assert.equal((await (await api.GET()).json()).items.length, 1);
  jobs = [];
  const after = await api.GET();
  assert.equal(after.headers.get('cache-control'), 'no-store');
  assert.equal((await after.json()).items.length, 0);
});

test('search returns a recoverable uncached response when public data is unavailable', async () => {
  let reads = 0;
  const limiter = load('../lib/request-limiter.ts', { 'node:crypto': { createHmac, randomBytes } });
  const api = load('../app/api/site-search/route.ts', {
    '@/lib/request-limiter': limiter,
    'next/server': { NextResponse: Response },
    '@/lib/article-content': { getPublicRoleModels: async () => [], getPublicEditorialPosts: async () => [] },
    '@/lib/curated-content': { getPublicBusinessCatalog: async () => { reads++; throw Error('offline'); } },
    '@/lib/site-search': { sanitizeSiteSearchQuery: value => value || '' },
    '@/lib/search-context': {},
  });
  const request = query => ({ headers: new Headers(), nextUrl: new URL(`https://directory.example/api/site-search?q=${query}`) });
  assert.equal((await api.GET(request('a'))).status, 200);
  assert.equal(reads, 0);
  const failed = await api.GET(request('صيدلية'));
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get('cache-control'), 'no-store');
  assert.match((await failed.json()).error, /جرّب/);
  for (let i = 0; i < 88; i++) assert.equal((await api.GET(request('a'))).status, 200);
  const limited = await api.GET(request('a'));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal(reads, 1);
});
