import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, modules, globals = {}) {
  const record = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module: record, exports: record.exports, require: name => name === 'react' ? { cache: fn => fn } : modules[name],
    AbortSignal, Response, Date, console, ...globals });
  return record.exports;
}

function cacheHarness() {
  const values = new Map();
  const registrations = [];
  const invalidations = [];
  const nextCache = {
    unstable_cache(fn, keys, options) {
      registrations.push({ keys, options });
      return (...args) => {
        const key = JSON.stringify([keys, args]);
        if (!values.has(key)) {
          const promise = Promise.resolve().then(() => fn(...args));
          values.set(key, promise);
          promise.catch(() => { if (values.get(key) === promise) values.delete(key); });
        }
        return values.get(key);
      };
    },
    revalidateTag(tag, profile) { invalidations.push({ tag, profile }); values.clear(); },
    revalidatePath() { values.clear(); },
  };
  const publicCache = load('../lib/public-content-cache.ts', { 'next/cache': nextCache });
  return { nextCache, publicCache, registrations, invalidations };
}

test('moderation visibility is read on each request and authenticated reads remain separate', async () => {
  const cache = cacheHarness();
  const calls = [];
  const moderator = load('../lib/auth/moderator.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: token => ({ Authorization: `Bearer ${token || 'public'}` }), SupabaseAuthError: Error },
  }, { fetch: async (url, init) => { calls.push({ url, ...init }); return Response.json([]); } });
  await moderator.getPublicCurated('business');
  await moderator.getPublicCurated('business');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].cache, 'no-store');
  assert.equal(calls[0].headers.Authorization, 'Bearer public');
  assert.ok(calls[0].signal instanceof AbortSignal);
  await moderator.getPublicCurated('news');
  assert.equal(calls.length, 3);
  await moderator.getEditorContent('editor-a');
  await moderator.getEditorContent('editor-b');
  assert.equal(calls.length, 5);
  assert.equal(calls[3].headers.Authorization, 'Bearer editor-a');
  assert.equal(calls[4].headers.Authorization, 'Bearer editor-b');
  assert.equal(cache.registrations.length, 0);
});

test('a successful moderation decision expires old public rows without serving the old visible record', async () => {
  const cache = cacheHarness();
  let hidden = false;
  const moderator = load('../lib/auth/moderator.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}), SupabaseAuthError: Error },
  }, { fetch: async url => {
    if (url.endsWith('/save_naqada_editor_content')) { hidden = true; return Response.json(true); }
    return Response.json([{ slug: 'listing', status: hidden ? 'hidden' : 'published' }]);
  } });
  assert.equal((await moderator.getPublicCurated('business'))[0].status, 'published');
  await moderator.callModeratorAction('editor', 'save_naqada_editor_content', {});
  assert.equal((await moderator.getPublicCurated('business'))[0].status, 'hidden');
  assert.equal(cache.invalidations.length, 1);
  assert.equal(cache.invalidations[0].tag, cache.publicCache.PUBLIC_CONTENT_TAG);
  assert.equal(cache.invalidations[0].profile.expire, 0);
});

test('an older owner read finishing after withdrawal cannot repopulate later requests', async () => {
  const cache = cacheHarness();
  let release;
  let reads = 0;
  const owners = load('../lib/owner-listings.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}) },
    '@/lib/owner-listing-photo': {},
  }, { fetch: async () => {
    reads++;
    if (reads === 1) return new Promise(resolve => { release = () => resolve(Response.json([{ id: 'withdrawn' }])); });
    return Response.json([]);
  } });
  const oldRead = owners.getPublishedOwnerListing('withdrawn');
  cache.publicCache.invalidatePublicContent();
  assert.equal(await owners.getPublishedOwnerListing('withdrawn'), null);
  release();
  assert.equal((await oldRead).id, 'withdrawn');
  assert.equal(await owners.getPublishedOwnerListing('withdrawn'), null);
  assert.equal(reads, 3);
});

test('failed public reads are not cached as empty catalogs and can recover on the next request', async () => {
  const cache = cacheHarness();
  let fail = true;
  let calls = 0;
  const owners = load('../lib/owner-listings.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({ Authorization: 'Bearer public' }) },
    '@/lib/owner-listing-photo': {},
  }, { fetch: async (url, init) => {
    calls++;
    assert.match(url, /status=eq\.published/);
    assert.ok(init.signal instanceof AbortSignal);
    return fail ? new Response(null, { status: 503 }) : Response.json([{ id: 'published' }]);
  } });
  await assert.rejects(owners.getPublishedOwnerListings(), /PUBLIC_ACTIVITIES_UNAVAILABLE/);
  fail = false;
  assert.equal((await owners.getPublishedOwnerListings())[0].id, 'published');
  assert.equal(calls, 3);
});

test('job visibility and expiry are checked again on the next request', async () => {
  const cache = cacheHarness();
  let now = Date.parse('2026-10-13T03:00:00Z');
  let calls = 0;
  class Clock extends Date { static now() { return now; } }
  const jobs = load('../lib/jobs.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}) },
  }, { Date: Clock, fetch: async url => {
    calls++;
    if (url.includes('kind=eq.offer')) return Response.json([{ id: 'offer', published_at: '2026-10-13T02:00:00Z', expires_at: '2026-10-13T03:00:10Z' }]);
    return Response.json([]);
  } });
  assert.equal((await jobs.getJobs()).jobs.length, 1);
  now += 20_000;
  assert.equal((await jobs.getJobs()).jobs.length, 0);
  assert.equal(calls, 6);
  assert.equal(cache.registrations.length, 0);
});

test('cancelled job reads preserve the unavailable state and do not populate the shared cache', async () => {
  const cache = cacheHarness();
  const jobs = load('../lib/jobs.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}) },
  }, { fetch: async (_url, init) => { init.signal.throwIfAborted(); return Response.json([]); } });
  const controller = new AbortController(); controller.abort();
  assert.equal((await jobs.getJobs(controller.signal)).available, false);
  assert.equal((await jobs.getJobs()).available, true);
});

test('a transient public read retries once and a failed pair does not revive static or hidden content', async () => {
  const cache = cacheHarness();
  let calls = 0;
  const moderator = load('../lib/auth/moderator.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}), SupabaseAuthError: Error },
  }, { fetch: async () => {
    calls++;
    if (calls <= 2) throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    return Response.json([{ slug: 'withdrawn', status: 'hidden', payload: {} }]);
  } });
  await assert.rejects(moderator.getPublicCurated('article'), /timed out/);
  assert.equal(calls, 2);
  const recovered = await moderator.getPublicCurated('article');
  assert.equal(recovered[0].status, 'hidden');
  assert.equal(calls, 3);
});

test('public authorization failures are not retried as transient outages', async () => {
  const cache = cacheHarness();
  let calls = 0;
  const moderator = load('../lib/auth/moderator.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}), SupabaseAuthError: Error },
  }, { fetch: async () => { calls++; return Response.json({ message: 'forbidden' }, { status: 403 }); } });
  await assert.rejects(moderator.getPublicCurated('business'), /403/);
  assert.equal(calls, 1);
});

test('owner reads retry a timeout once with a fresh signal and retain published-only scope', async () => {
  const cache = cacheHarness();
  const signals = [];
  const owners = load('../lib/owner-listings.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}) },
    '@/lib/owner-listing-photo': {},
  }, { fetch: async (url, init) => {
    assert.match(url, /status=eq\.published/);
    signals.push(init.signal);
    if (signals.length === 1) throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    return Response.json([{ id: 'published' }]);
  } });
  assert.equal((await owners.getPublishedOwnerListing('published')).id, 'published');
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(signals[1].aborted, false);
});

test('owner permission failures are neither retried nor cached as empty results', async () => {
  const cache = cacheHarness();
  let calls = 0;
  const owners = load('../lib/owner-listings.ts', {
    'next/cache': cache.nextCache, '@/lib/public-content-cache': cache.publicCache,
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://data.example', restHeaders: () => ({}) },
    '@/lib/owner-listing-photo': {},
  }, { fetch: async () => { calls++; return new Response(null, { status: 403 }); } });
  await assert.rejects(owners.getPublishedOwnerListings(), /PUBLIC_ACTIVITIES_UNAVAILABLE/);
  assert.equal(calls, 1);
  await assert.rejects(owners.getPublishedOwnerListings(), /PUBLIC_ACTIVITIES_UNAVAILABLE/);
  assert.equal(calls, 2);
});
