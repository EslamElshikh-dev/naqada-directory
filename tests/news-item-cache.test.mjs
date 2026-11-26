import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, modules, globals = {}) {
  const record = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { module: record, exports: record.exports, require: name => modules[name],
    Response, AbortSignal, URL, console, ...globals });
  return record.exports;
}

const story = (id, publishedAt = '2026-11-20T00:00:00Z') => ({ id, title: id, description: 'Saved summary',
  url: `https://example.invalid/${id}`, source: 'Synthetic publisher', sourceUrl: 'https://example.invalid',
  publishedAt, imageUrl: null, imageAlt: '', category: 'تعليم', isNaqada: true, isOfficial: false });

function harness() {
  const values = new Map(), invalidations = [], calls = [];
  const state = { archive: new Map(), revisions: [], fail: false, pause: null };
  const nextCache = {
    unstable_cache(fn, keys, options) {
      return async (...args) => {
        const key = JSON.stringify([keys, args]);
        if (values.has(key)) return values.get(key).value;
        const value = await fn(...args);
        values.set(key, { value, tags: options.tags });
        return value;
      };
    },
    revalidateTag(tag, profile) {
      invalidations.push({ tag, profile });
      for (const [key, entry] of values) if (entry.tags.includes(tag)) values.delete(key);
    }, revalidatePath() {},
  };
  const publicCache = load('../lib/public-content-cache.ts', { 'next/cache': nextCache });
  const itemCache = load('../lib/news-item-cache.ts', {
    react: { cache: fn => fn }, 'next/cache': nextCache,
    './public-content-cache': publicCache, './news-editorial': { localNewsBriefs: {} },
    './auth/supabase-rest': { SUPABASE_URL: 'https://database.invalid', restHeaders: () => ({}) },
  }, { fetch: async input => {
    const url = new URL(input); calls.push(url.pathname + url.search);
    if (state.fail) return new Response('{}', { status: 503 });
    if (url.pathname.endsWith('get_public_naqada_content')) return Response.json(state.revisions);
    const id = url.searchParams.get('id')?.slice(3);
    const data = id ? (state.archive.has(id) ? [state.archive.get(id)] : []) : [...state.archive.values()]
      .filter(item => !url.searchParams.has('published_at') || Date.parse(item.publishedAt) <= Date.parse(url.searchParams.get('published_at').slice(4)))
      .sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
    const result = Response.json(data.map(payload => ({ payload })));
    if (id && state.pause) { const pause = state.pause; state.pause = null; await pause(); }
    return result;
  } });
  return { state, publicCache, ...itemCache, values, calls, invalidations };
}

test('a new unrelated story and its delayed purge leave a complete archived story cached', async () => {
  const h = harness(); h.state.archive.set('story-one', story('story-one'));
  await h.getNewsSnapshot('story-one'); const before = h.calls.length;
  h.state.archive.set('story-two', story('story-two', '2026-11-21T00:00:00Z'));
  h.publicCache.invalidatePublicContent(['news-archive'], ['story-two']);
  assert.equal(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')).title, 'story-one');
  h.publicCache.invalidatePublicContent(['news-archive'], ['story-two']);
  await h.getNewsSnapshot('story-one');
  assert.equal(h.calls.length, before);
  assert.ok(!h.invalidations.some(x => x.tag === h.publicCache.NEWS_ITEMS_TAG));
  assert.ok([...h.values.values()].every(x => !x.tags.includes('naqada-public-content:news-archive')));
});

test('edits, hidden tombstones, deleted snapshots and the full fallback cannot retain old story content', async () => {
  const h = harness(); h.state.archive.set('story-one', story('story-one'));
  await h.getNewsSnapshot('story-one');
  h.state.archive.set('story-one', { ...story('story-one'), title: 'Corrected title' });
  h.publicCache.invalidatePublicContent(['news-archive'], ['story-one']);
  assert.equal(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')).title, 'Corrected title');
  h.state.revisions = [{ slug: 'story-one', status: 'hidden', payload: {} }];
  h.publicCache.invalidatePublicContent(['news'], ['story-one']);
  assert.equal(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')), null);
  h.state.revisions = []; h.state.archive.delete('story-one');
  h.publicCache.invalidatePublicContent(['news-archive'], ['story-one']);
  assert.equal(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')), null);
  h.state.archive.set('story-one', story('story-one'));
  h.publicCache.invalidatePublicContent(['news-archive']);
  assert.equal(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')).id, 'story-one');
});

test('related links use per-story selections, preserve real dates and respect corrections and hiding', async () => {
  const h = harness(), root = story('root-story');
  h.state.archive.set('older-story', story('older-story', '2026-11-19T00:00:00Z'));
  h.state.archive.set('newer-story', story('newer-story', '2026-11-21T00:00:00Z'));
  assert.deepEqual(Array.from(await h.getRelatedNewsItems(root), x => x.id), ['older-story']);
  const before = h.calls.length;
  h.publicCache.invalidatePublicContent(['news-archive'], ['newer-story']);
  await h.getRelatedNewsItems(root); assert.equal(h.calls.length, before);
  h.state.revisions = [{ slug: 'older-story', status: 'published', payload: { title: 'Corrected related title' } }];
  h.publicCache.invalidatePublicContent(['news'], ['older-story']);
  assert.equal((await h.getRelatedNewsItems(root))[0].title, 'Corrected related title');
  h.state.archive.set('older-story', { ...story('older-story', '2026-11-19T00:00:00Z'), category: 'صحة', isNaqada: false });
  h.publicCache.invalidatePublicContent(['news-archive'], ['older-story']);
  assert.equal((await h.getRelatedNewsItems(root)).length, 0, 'Updated topic/locality must be checked after resolving cached candidate IDs');
  h.state.archive.set('older-story', story('older-story', '2026-11-19T00:00:00Z'));
  h.state.revisions[0].status = 'hidden';
  h.publicCache.invalidatePublicContent(['news'], ['older-story']);
  assert.equal((await h.getRelatedNewsItems(root)).length, 0);
});

test('a late pre-hide snapshot is removed by the retained second targeted purge', async () => {
  const h = harness(); h.state.archive.set('story-one', story('story-one'));
  let release, started;
  const ready = new Promise(resolve => { started = resolve; });
  h.state.pause = () => new Promise(resolve => { release = resolve; started(); });
  const earlier = h.getNewsSnapshot('story-one'); await ready;
  h.state.revisions = [{ slug: 'story-one', status: 'hidden', payload: {} }];
  h.publicCache.invalidatePublicContent(['news'], ['story-one']);
  release(); await earlier;
  assert.ok(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')), 'The harness deliberately permits a stale late cache write');
  h.publicCache.invalidatePublicContent(['news'], ['story-one']);
  assert.equal(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')), null);
});

test('failed public reads are not cached as missing content; malformed IDs cause no reads', async () => {
  const h = harness(); h.state.archive.set('story-one', story('story-one'));
  const invalid = await h.getNewsSnapshot('bad),id.gt.0');
  assert.equal(invalid.archived, null); assert.equal(h.calls.length, 0);
  h.state.fail = true; await assert.rejects(h.getNewsSnapshot('story-one'));
  assert.equal(h.values.size, 0);
  h.state.fail = false;
  assert.equal(h.projectNewsSnapshot(await h.getNewsSnapshot('story-one')).title, 'story-one');
});
