import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, dependencies, globals = {}) {
  const record = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module: record, exports: record.exports, require: name => dependencies[name],
    URL, Response, AbortSignal, console, ...globals });
  return record.exports;
}

const snapshot = {
  id: 'undated-story', title: 'عنوان الأرشيف', description: 'موجز محفوظ',
  url: 'https://www.elbalad.news/1234567?utm_source=archive', source: 'صدى البلد',
  sourceUrl: 'https://www.elbalad.news/', publishedAt: '', imageUrl: null,
  imageAlt: '', category: 'محليات', isNaqada: true, isOfficial: false,
  editorialBody: 'النص المحفوظ',
};
const liveStory = { ...snapshot, title: 'عنوان أحدث', editorialBody: 'نص أحدث',
  url: 'https://elbalad.news/amp/1234567', publishedAt: '2026-11-13T02:10:00.000Z' };

function harness({ archived = snapshot, live = [liveStory], curated = [], sourceFailure = false } = {}) {
  const calls = { archive: 0, sources: 0, curated: 0 };
  const site = { siteConfig: { url: 'https://directory.invalid' }, normalizeArabic: value => value };
  const quality = load('../lib/news-feed-quality.ts', { './site': site });
  const news = load('../lib/news.ts', {
    react: { cache: fn => fn },
    'next/cache': { unstable_cache: (fn, keys) => keys[0] === 'naqada-news-sources-v4' ? async () => {
      calls.sources++;
      if (sourceFailure) throw Error('synthetic source failure');
      return { items: live, checkedAt: '2026-11-14T00:00:00Z', successfulFeeds: 1, totalFeeds: 8 };
    } : fn },
    './site': site, './news-article': {}, './news-editorial': { localNewsBriefs: {} },
    './auth/moderator': { getPublicCurated: async () => { calls.curated++; return curated; } },
    './auth/supabase-rest': { SUPABASE_URL: 'https://database.invalid', restHeaders: () => ({}) },
    './public-content-cache': { PUBLIC_CONTENT_TTL: 3600, publicContentTag: scope => scope },
    './news-feed-quality': quality,
  }, { process: { env: {} }, fetch: async url => {
    assert.equal(new URL(url).pathname, '/rest/v1/naqada_news_archive');
    calls.archive++;
    return Response.json(archived ? [{ payload: archived }] : []);
  } });
  return { news, quality, calls };
}

test('an incomplete news detail restores the matching source date used by the list without replacing snapshot content', async () => {
  const { news } = harness();
  const detail = await news.getNewsItem(snapshot.id);
  const listed = (await news.getLatestNews()).items.find(item => item.id === snapshot.id);
  assert.equal(detail.publishedAt, liveStory.publishedAt);
  assert.equal(detail.publishedAt, listed.publishedAt);
  assert.equal(detail.title, snapshot.title);
  assert.equal(detail.editorialBody, snapshot.editorialBody);
  assert.equal(detail.url, snapshot.url);
  assert.equal(snapshot.publishedAt, '', 'The source snapshot is not mutated');
});

test('a valid archived publication date remains authoritative without reading news sources', async () => {
  const archived = { ...snapshot, publishedAt: '2026-11-12T03:00:00Z' };
  const { news, calls } = harness({ archived, sourceFailure: true });
  assert.equal((await news.getNewsItem(snapshot.id)).publishedAt, archived.publishedAt);
  assert.equal(calls.sources, 0);
});

test('hidden snapshots return null before consulting sources or restoring dates', async () => {
  const { news, calls } = harness({ curated: [{ slug: snapshot.id, status: 'hidden' }] });
  assert.equal(await news.getNewsItem(snapshot.id), null);
  assert.equal(calls.sources, 0);
});

test('source failure and unavailable dates preserve archive access without inventing a publication time', async () => {
  for (const publishedAt of ['', 'invalid-date']) {
    for (const options of [{ sourceFailure: true }, { live: [] }, { live: [{ ...liveStory, publishedAt: 'invalid-date' }] }]) {
      const { news } = harness({ ...options, archived: { ...snapshot, publishedAt } });
      const detail = await news.getNewsItem(snapshot.id);
      assert.equal(detail.publishedAt, '');
      assert.equal(detail.title, snapshot.title);
    }
  }
});

test('a similar title, shared ID or different publisher cannot supply another article publication date', async () => {
  for (const url of ['https://www.elbalad.news/7654321', 'https://www.cairo24.com/1234567']) {
    const { news } = harness({ live: [{ ...liveStory, url }] });
    assert.equal((await news.getNewsItem(snapshot.id)).publishedAt, '');
  }
});

test('published moderation overrides survive date restoration and invalid IDs perform no reads', async () => {
  const { news, calls } = harness({ curated: [{ slug: snapshot.id, origin: 'static', status: 'published',
    payload: { title: 'عنوان المراجعة', summary: 'موجز المراجعة', body: 'النص المراجع' } }] });
  assert.equal(await news.getNewsItem('bad),id.gt.0'), null);
  assert.deepEqual(calls, { archive: 0, sources: 0, curated: 0 });
  const detail = await news.getNewsItem(snapshot.id);
  assert.equal(detail.publishedAt, liveStory.publishedAt);
  assert.equal(detail.title, 'عنوان المراجعة');
  assert.equal(detail.editorialBody, 'النص المراجع');
});
