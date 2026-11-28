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
function loader(stubs = {}) {
  const modules = new Map();
  function load(name, parent = root) {
    if (Object.hasOwn(stubs, name)) return stubs[name];
    if (name.endsWith('.css')) return {};
    if (!name.startsWith('.') && !name.startsWith('@/')) return nodeRequire(name);
    const target = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(parent, name);
    const path = [target, `${target}.ts`, `${target}.tsx`, `${target}.json`].find(existsSync);
    if (!path) throw Error(`Missing test dependency: ${name}`);
    if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'));
    if (modules.has(path)) return modules.get(path).exports;
    const record = { exports: {} }; modules.set(path, record);
    const output = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(output, { module: record, exports: record.exports, URL, URLSearchParams, console,
      require: dependency => load(dependency, dirname(path)),
    }, { filename: path });
    return record.exports;
  }
  return load;
}

const actual = loader();
const site = actual('./lib/site');
const activity = actual('./lib/activity-landings');
const date = actual('./lib/home-content');
const places = [
  { name: 'موضع قديم', slug: 'old-place', businessCount: 20 },
  { name: 'موضع جديد', slug: 'new-place', businessCount: 0 },
  { name: 'موضع موثق', slug: 'guide-place', businessCount: 0 },
];
const categories = [{ name: 'قسم قديم', slug: 'old' }, { name: 'قسم جديد', slug: 'new' }, { name: 'قسم المرجع', slug: 'guide' }];
const landings = categories.slice(0, 2).map(item => ({ ...item, searchLabel: item.name, visualCategory: item.name, description: item.name, categories: [item.name] }));
const listing = (id, locality, category, checked) => ({ id, slug: id, name: id, locality, category, checked, subcategory: null });
const historical = [listing('old-1', places[0].name, categories[0].name, '2026-09-04'), listing('old-2', places[0].name, categories[0].name, '2026-09-04')];
const current = [listing('new-1', places[1].name, categories[1].name, '2026-12-01'), listing('new-2', places[1].name, categories[1].name, '2026-11-30'), listing('guide-1', places[2].name, categories[2].name, '2026-12-02')];
const article = name => name === places[2].name ? { modifiedAt: '2026-09-04', seoTitle: 'دليل موضع موثق', description: 'مادة محلية موثقة' } : null;

function harness(businesses) {
  const load = loader({
    '@/lib/data': { categories, localities: places, canonicalLocalityName: actual('./lib/data').canonicalLocalityName, getLocalityBySlug: slug => places.find(item => item.slug === slug), getCategoryBySlug: slug => categories.find(item => item.slug === slug) },
    '@/lib/curated-content': { getPublicBusinessCatalog: async () => ({ businesses, directoryBusinesses: businesses }) },
    '@/lib/auth/moderator': { getPublicCurated: async () => [] },
    '@/lib/article-content': { getPublicEditorialPosts: async () => [], getPublicRoleModels: async () => [] },
    '@/lib/article-document': { readArticleDocument: () => null },
    '@/lib/village-articles': { getVillageArticle: article },
    '@/lib/activity-landings': { activityLandings: landings, getBusinessesForActivity: (item, source = historical) => activity.getBusinessesForActivity(item, source) },
    '@/lib/knowledge': { indexableKnowledgePlaces: [], indexableKnowledgeHeritage: [], indexableKnowledgePeople: [], primaryKnowledgeContributor: { slug: 'source' } },
    '@/lib/owner-listings': { getPublishedOwnerListings: async () => [] },
    '@/lib/home-content': date,
    '@/lib/site': site,
    '@/components/directory-explorer': {}, '@/components/brand-mark': {}, '@/components/share-actions': {},
    '@/components/service-locality-discovery': {}, '@/components/utility-page-header': {},
  });
  return {
    sitemap: load('./app/sitemap').default,
    villageMetadata: load('./app/villages/[slug]/public-document').generateMetadata,
    categoryMetadata: load('./app/directory/[category]/public-document').generateMetadata,
  };
}

const villageProps = slug => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });

test('sitemap follows published additions and withdrawals instead of historical counts', async () => {
  const { sitemap } = harness(current);
  const entries = await sitemap();
  const byPath = new Map(entries.map(entry => [new URL(entry.url).pathname, entry]));
  assert.equal(byPath.has('/activities/old/'), false, 'Withdrawn historical activity leaves the sitemap');
  assert.equal(byPath.has('/activities/new/'), true, 'A newly published activity enters the sitemap');
  assert.equal(byPath.has('/villages/old-place/'), false, 'A historical count cannot keep an empty results page indexable');
  assert.equal(byPath.has('/villages/new-place/'), true, 'A published activity is sufficient for a new locality');
  assert.equal(byPath.has('/directory/old/'), false, 'Empty category leaves the sitemap');
  assert.equal(byPath.has('/directory/new/'), true);
  assert.equal(byPath.get('/activities/new/').lastModified.toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(byPath.get('/villages/guide-place/').lastModified.toISOString(), '2026-12-02T00:00:00.000Z', 'A newly published listing updates the existing guide date');
  assert.equal(byPath.get('/').lastModified.toISOString(), '2026-12-02T00:00:00.000Z', 'Homepage public counts and recent listings are dated too');
});

test('village metadata and sitemap agree on newly populated and withdrawn localities', async () => {
  const { villageMetadata, sitemap } = harness(current);
  const old = await villageMetadata(villageProps('old-place'));
  const added = await villageMetadata(villageProps('new-place'));
  assert.equal(old.robots.index, false);
  assert.equal(added.robots.index, true);
  const urls = new Set((await sitemap()).map(entry => new URL(entry.url).pathname));
  assert.equal(urls.has(old.alternates.canonical), false);
  assert.equal(urls.has(added.alternates.canonical), true);
});

test('a locality with a documented article remains indexable without published listings', async () => {
  const { villageMetadata, sitemap } = harness([]);
  const guide = await villageMetadata(villageProps('guide-place'));
  assert.notEqual(guide.robots.index, false);
  assert.ok((await sitemap()).some(entry => new URL(entry.url).pathname === '/villages/guide-place/'));
});

test('empty categories are noindex while a one-listing category remains available to search', async () => {
  const { categoryMetadata } = harness(current);
  const props = category => ({ params: Promise.resolve({ category }), searchParams: Promise.resolve({}) });
  assert.equal((await categoryMetadata(props('old'))).robots.index, false);
  assert.notEqual((await categoryMetadata(props('guide'))).robots.index, false);
});

test('homepage modification dates ignore missing and invalid listing dates', () => {
  const baseline = date.getHomeLastModified([], []);
  assert.equal(date.getHomeLastModified([], [], [{ checked: null }, { checked: 'invalid' }]).getTime(), baseline.getTime());
});
