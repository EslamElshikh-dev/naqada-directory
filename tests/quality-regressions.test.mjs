import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const nodeRequire = createRequire(import.meta.url);
const modules = new Map();
function loadModule(name, parent = root) {
  const target = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(parent, name);
  const path = [target, `${target}.ts`, `${target}.json`].find(existsSync);
  if (!path) throw Error(`Missing test dependency: ${name}`);
  if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'));
  if (modules.has(path)) return modules.get(path).exports;
  const record = { exports: {} };
  modules.set(path, record);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, { module: record, exports: record.exports, URL, URLSearchParams,
    require: (dependency) => dependency.startsWith('.') || dependency.startsWith('@/')
      ? loadModule(dependency, dirname(path)) : nodeRequire(dependency),
  }, { filename: path });
  return record.exports;
}

const data = loadModule('./lib/data');
const search = loadModule('./lib/site-search');
const ranking = loadModule('./lib/search-ranking');
const knowledge = loadModule('./lib/knowledge');
const news = loadModule('./lib/news-feed-quality');
const robots = loadModule('./app/robots').default;
const priorities = loadModule('./lib/seo-priorities');
const now = Date.parse('2026-10-19T05:00:00Z');

test('live stories outside the newest archive window receive bounded safe snapshot lookups', () => {
  const latest = Array.from({ length: 60 }, (_, index) => ({ id: `recent-${index}` }));
  const old = Array.from({ length: 53 }, (_, index) => ({ id: `old-${index}` }));
  const queries = news.missingNewsSnapshotQueries([...old, old[0], latest[0], { id: 'editorial', isOriginal: true }, { id: 'bad),id.gt.0' }], latest);
  assert.equal(queries.length, 2);
  assert.ok(queries[0].endsWith('&limit=50'));
  assert.ok(queries[1].endsWith('&limit=3'));
  assert.ok(queries[0].includes('old-0'));
  assert.ok(queries[1].includes('old-52'));
  assert.ok(!queries.join('').includes('recent-0'));
  assert.ok(!queries.join('').includes('editorial'));
  assert.ok(!queries.join('').includes('bad'));
  assert.equal(news.missingNewsSnapshotQueries(latest, latest).length, 0);
});

test('search facets count the current public catalog and drop emptied categories and localities', () => {
  const sample = data.businesses.find(item => item.locality && item.category);
  const only = [{ ...sample, id: 'owner:7828410d-1d6b-4ab9-8394-6a266d0bcf2e', slug: 'owner-one' }];
  const locality = data.canonicalLocalityName(sample.locality);
  const place = search.searchSite(locality, 100, ['locality'], only).find(item => item.title === locality);
  assert.ok(place);
  assert.match(place.subtitle, /1 نشاطًا/);
  const category = search.searchSite(sample.category, 100, ['category'], only).find(item => item.title === sample.category);
  assert.equal(category.subtitle, '1 نشاطًا منشورًا');
  assert.equal(search.searchSite(locality, 100, ['locality'], []).length, 0);
  assert.equal(search.searchSite(sample.category, 100, ['category'], []).length, 0);
  assert.equal(search.searchSite(sample.name, 100, ['listing'], only)[0].href, loadModule('./lib/activity-path').ownerActivityHref(only[0]));
});

test('live news previews keep the publication date of the matching published archive snapshot', () => {
  const live = { id: 'story', title: 'خبر محلي', url: 'https://www.youm7.com/story/2026/10/18/example/1234', sourceUrl: 'https://www.youm7.com', publishedAt: '2026-10-18T18:00:00Z', imageUrl: 'https://images.example/new.webp', description: 'موجز محدث' };
  const archived = { ...live, url: `${live.url}?utm_source=archive`, publishedAt: '2026-10-18T06:01:00Z', imageUrl: 'https://images.example/old.webp' };
  const [preview] = news.reconcileNewsCopies([live], [archived]);
  assert.equal(preview.publishedAt, archived.publishedAt);
  assert.equal(preview.imageUrl, live.imageUrl);
  assert.equal(preview.description, live.description);
  assert.equal(news.reconcileNewsCopies([live], [{ ...archived, publishedAt: '' }])[0].publishedAt, live.publishedAt);
});

test('event grouping preserves different places, dates, quantities, original reports and accident stories', () => {
  const title = 'افتتاح معرض المنتجات المحلية للشباب في مدينة نقادة';
  const story = (id, titleOverride = title, overrides = {}) => ({ id, title: titleOverride, source: id, sourceUrl: `https://${id}.example`, publishedAt: '2026-10-18T12:00:00Z', category: 'مجتمع', isNaqada: true, ...overrides });
  const a = story('publisher-a');
  const b = story('publisher-b', 'افتتاح معرض المنتجات المحلية للشباب بمدينة نقادة');
  assert.equal(news.groupNewsEvents([a, { ...b, title }]).length, 1);
  assert.equal(news.groupNewsEvents([a, { ...b, title: title.replace('نقادة', 'دنفيق') }]).length, 2);
  assert.equal(news.groupNewsEvents([a, { ...b, publishedAt: '2026-10-16T12:00:00Z' }]).length, 2);
  assert.equal(news.groupNewsEvents([a, { ...b, isOriginal: true }]).length, 2);
  assert.equal(news.groupNewsEvents([story('a', 'افتتاح 4 مدارس جديدة لأهالي مدينة نقادة'), story('b', 'افتتاح 5 مدارس جديدة لأهالي مدينة نقادة')]).length, 2);
  const accident = 'مصرع شخصين في حادث على طريق مدينة نقادة';
  assert.equal(news.groupNewsEvents([story('a', accident), story('b', accident)]).length, 2);
});

test('village counts follow the visible public catalog, including new owner activities and hidden removals', () => {
  const { localitiesWithPublicCounts } = loadModule('./lib/public-localities');
  const hidden = data.businesses[0];
  const hiddenPlace = data.canonicalLocalityName(hidden.locality);
  const ownerPlace = data.localities.find(item => item.name !== hiddenPlace).name;
  const visible = data.businesses.filter(item => item.id !== hidden.id);
  visible.push({ ...hidden, id: 'owner:new', slug: 'owner-new', locality: ownerPlace });
  const counted = localitiesWithPublicCounts(data.localities, visible);
  const expected = name => visible.filter(item => data.canonicalLocalityName(item.locality) === name).length;
  assert.equal(counted.find(item => item.name === hiddenPlace).businessCount, expected(hiddenPlace));
  assert.equal(counted.find(item => item.name === ownerPlace).businessCount, expected(ownerPlace));
  assert.equal(visible.length, data.businesses.length);
});

test('owner activities keep their published canonical URL in cards, homepage updates and structured data', () => {
  const { publicBusinessHref } = loadModule('./lib/business-links');
  const id = '7828410d-1d6b-4ab9-8394-6a266d0bcf2e';
  assert.equal(publicBusinessHref({ id: `owner:${id}`, slug: `owner-${id}` }), loadModule('./lib/activity-path').ownerActivityHref({id}));
  assert.equal(publicBusinessHref({ id: `owner-${id}`, slug: id }), loadModule('./lib/activity-path').ownerActivityHref({id}));
  assert.equal(publicBusinessHref({ id: 'static:1', slug: 'صيدلية-مؤمن' }), `/listing/${encodeURIComponent('صيدلية-مؤمن')}/`);
});

test('school searches match activity type and locality, not a school in another activity address', () => {
  const matches = search.searchSite('مدرسة في بشلاو', 100, ['listing']);
  assert.ok(matches.length > 0);
  for (const match of matches) {
    const record = data.businesses.find((item) => match.href === `/listing/${item.slug}`);
    assert.equal(record.category, 'التعليم', record.name);
    assert.equal(data.canonicalLocalityName(record.locality), 'بشلاو', record.name);
  }
  const shop = { title: 'سوبر ماركت أبو جمال', category: 'التجزئة والتسوق', subcategory: 'سوبر ماركت', locality: 'بشلاو', address: 'شارع مدرسة عمر بن الخطاب' };
  assert.equal(ranking.rankSearchFields(shop, 'مدرسة في بشلاو'), -1);
  assert.ok(ranking.rankSearchFields(shop, 'سوبر ماركت شارع مدرسة عمر بن الخطاب') >= 0);
  assert.ok(ranking.rankSearchFields(shop, 'سوبر ماركت بجوار مدرسة عمر بن الخطاب') >= 0);
});

test('Arabic pharmacy variants and pharmacy locality matches survive intent filtering', () => {
  const names = (query) => Array.from(search.searchSite(query, 100, ['listing']), (item) => item.href);
  assert.deepEqual(names('صيدلية'), names('صيدليه'));
  assert.ok(names('صيدلية').length >= 20);
  const local = search.searchSite('صيدلية في الخطارة', 100, ['listing']);
  assert.ok(local.length >= 6);
  assert.ok(local.every((item) => item.subtitle.includes('صيدلية') && item.subtitle.includes('الخطارة')));
});

test('hospital recommendations stay in the healthcare category and exclude the current record', () => {
  const hospital = data.businesses.find((item) => item.name === 'مستشفى النيل بنقادة');
  assert.ok(hospital);
  const related = data.relatedBusinesses(hospital, 6);
  assert.ok(related.length >= 3);
  assert.ok(related.every((item) => item.id !== hospital.id && item.category === hospital.category));
});

test('compact locality people lists show a repeated source name once without deleting source records', () => {
  const people = knowledge.knowledgePeopleForLocality('الخطارة', 20);
  assert.equal(people.filter((item) => item.name === 'دسوقي الخطاري').length, 1);
  assert.equal(knowledge.knowledgePeople.filter((item) => item.name === 'دسوقي الخطاري').length, 2);
});

test('knowledge records need a published summary before becoming eligible for indexing', () => {
  for (const record of [
    { editorialStatus: 'summary_pending' },
    { editorialStatus: 'summary_pending', summary: 'مسودة لم تُراجع' },
    { editorialStatus: 'published' },
    { editorialStatus: 'published', summary: '   ' },
    { editorialStatus: 'unknown', summary: 'نص غير معتمد' },
  ]) assert.equal(knowledge.isKnowledgeRecordIndexable(record), false);
  assert.equal(knowledge.isKnowledgeRecordIndexable({ editorialStatus: 'published', summary: 'نبذة تحريرية معتمدة بالمصدر.' }), true);
});

test('reference-only people and heritage stay available while excluded from indexable collections', () => {
  for (const [records, indexable] of [
    [knowledge.knowledgePeople, knowledge.indexableKnowledgePeople],
    [knowledge.knowledgeHeritage, knowledge.indexableKnowledgeHeritage],
  ]) {
    assert.ok(records.length > 0);
    const pending = records.filter((record) => record.editorialStatus === 'summary_pending');
    assert.ok(pending.length > 0);
    assert.ok(pending.every((record) => !indexable.includes(record)));
    assert.ok(indexable.every(knowledge.isKnowledgeRecordIndexable));
  }
});

test('robots permits public listing photos while keeping other API paths excluded', () => {
  const rules = robots().rules;
  const allows = [].concat(rules.allow || []);
  const disallows = [].concat(rules.disallow || []);
  // Google selects the most specific matching path; allow wins an equal-length tie.
  const allowed = (path) => Math.max(-1, ...allows.filter((rule) => path.startsWith(rule)).map((rule) => rule.length))
    >= Math.max(-1, ...disallows.filter((rule) => path.startsWith(rule)).map((rule) => rule.length));
  for (const path of ['/', '/directory/', '/api/owner-photos/owner/listing/photo.jpg', '/api/directory/photo?path=photo.jpg']) {
    assert.equal(allowed(path), true, path);
  }
  for (const path of ['/api/auth/session', '/api/owner-listings', '/api/directory/preview']) {
    assert.equal(allowed(path), false, path);
  }
});

test('focused sitemap keeps canonical priority pages and their actual modification dates', () => {
  const home = { url: 'https://naqada-directory.vercel.app/', lastModified: '2026-10-16T00:00:00Z' };
  const bashlaw = { url: `https://naqada-directory.vercel.app/villages/${encodeURIComponent('بشلاو')}/`, lastModified: '2026-09-04T00:00:00Z' };
  const other = { url: 'https://naqada-directory.vercel.app/account/login/' };
  const queryCopy = { url: `${home.url}?_rsc=example` };
  const result = priorities.selectPrioritySitemap([home, other, bashlaw, home, queryCopy]);
  assert.deepEqual(Array.from(result), [home, bashlaw]);
  assert.ok(priorities.prioritySitemapUrls.size >= 10 && priorities.prioritySitemapUrls.size <= 25);
  assert.ok(Array.from(priorities.prioritySitemapUrls).every((url) => url.startsWith(home.url) && url.endsWith('/') && !url.includes('?')));
  assert.ok([].concat(robots().sitemap).includes('https://naqada-directory.vercel.app/priority/sitemap.xml'));
});

function story(overrides = {}) {
  return { id: 'one', title: 'خبر محلي', description: '', url: 'https://www.elbalad.news/1234567',
    source: 'صدى البلد', sourceUrl: 'https://www.elbalad.news/', publishedAt: '2026-10-18T08:00:00Z',
    imageUrl: null, imageAlt: '', category: 'خدمات', isNaqada: true, isOfficial: false, ...overrides };
}

test('latest news excludes historical, undated, invalid and future items while preserving the input archive', () => {
  const items = [story(), story({ id: 'old', url: 'https://www.elbalad.news/2', publishedAt: '2020-08-20T08:00:00Z' }),
    story({ id: 'undated', url: 'https://www.elbalad.news/3', publishedAt: '' }),
    story({ id: 'invalid', url: 'https://www.elbalad.news/4', publishedAt: 'bad-date' }),
    story({ id: 'future', url: 'https://www.elbalad.news/5', publishedAt: '2026-10-21T08:00:00Z' })];
  assert.deepEqual(Array.from(news.selectLatestNews(items, now), (item) => item.id), ['one']);
  assert.equal(items.length, 5);
});

test('article IDs, AMP URLs and tracking parameters do not duplicate the same publisher article', () => {
  assert.equal(news.deduplicateNews([story(), story({ id: 'amp', title: 'عنوان بديل', url: 'https://www.elbalad.news/amp/1234567?utm_source=feed' })]).length, 1);
  const source = story({ url: 'https://www.youm7.com/story/2026/10/18/example/123?utm_source=feed', sourceUrl: 'https://www.youm7.com/' });
  assert.equal(news.deduplicateNews([source, { ...source, id: 'tracked', title: 'عنوان آخر', url: 'https://youm7.com/story/2026/10/18/example/123/?fbclid=test' }]).length, 1);
  assert.equal(news.deduplicateNews([story(), story({ id: 'other', url: 'https://www.cairo24.com/7654321', source: 'القاهرة 24', sourceUrl: 'https://www.cairo24.com/' })]).length, 2);
  assert.equal(news.selectLatestNews([story(), story({ id: 'another-date', url: 'https://www.elbalad.news/1111111', publishedAt: '2026-10-01T08:00:00Z' })], now).length, 2);
});

test('repeated publisher summaries are collapsed but changing figures or publishers preserves a separate report', () => {
  const description = 'شنت مديرية التموين والتجارة الداخلية بقنا حملة تفتيشية صباحية في مركز نقادة أسفرت عن ضبط 2400 كيس منتهية الصلاحية داخل مخزن';
  const first = story({ description });
  const duplicate = story({ id: 'repeat', title: 'متابعة حملة التموين', url: 'https://www.elbalad.news/9876543', publishedAt: '2026-10-17T08:00:00Z', description: `${description} لأعلى المزيد` });
  assert.equal(news.selectLatestNews([first, duplicate], now).length, 1);
  assert.equal(news.selectLatestNews([first, { ...duplicate, description: description.replace('2400', '2500') }], now).length, 2);
  assert.equal(news.selectLatestNews([first, { ...duplicate, sourceUrl: 'https://www.cairo24.com/', url: 'https://www.cairo24.com/9876543' }], now).length, 2);
});

test('archive duplicates are removed after merging with live news, before applying the display limit', () => {
  const live = story();
  const archivedCopy = story({ id: 'archived', url: `${live.url}?amp=1`, title: 'نسخة محفوظة' });
  const second = story({ id: 'two', url: 'https://www.elbalad.news/2222222', title: 'خبر ثان', publishedAt: '2026-10-17T08:00:00Z' });
  const result = news.selectLatestNews([live, archivedCopy, second], now, 2);
  assert.deepEqual(Array.from(result, (item) => item.id), ['one', 'two']);
});
