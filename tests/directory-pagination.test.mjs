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
const stateModule = loadModule('./lib/directory-state');
const { resolveDirectoryState, directoryResults, directoryPageMetadata, directoryPageHref, directoryQuerySuffix } = stateModule;
const catalog = data.businesses.map(item => ({ ...item, locality: data.canonicalLocalityName(item.locality) }));
const scope = { categories: data.categories, localities: data.localities, lockedLocality: 'بشلاو' };
const local = catalog.filter(item => item.locality === scope.lockedLocality);
const stateFor = params => resolveDirectoryState(params, local, scope);
const resultsFor = state => directoryResults(local, state, data.localities.map(item => item.name));
const idsOnPage = state => Array.from(resultsFor(state).slice((state.page - 1) * 12, state.page * 12), item => item.id);

test('village pages select different published records before hydration', () => {
  const first = stateFor({});
  const second = stateFor({ page: '2' });
  const third = stateFor({ page: '3' });
  assert.equal(first.page, 1);
  assert.equal(second.page, 2);
  assert.equal(third.page, 3);
  assert.ok(second.totalPages >= 3);
  const a = idsOnPage(first), b = idsOnPage(second), c = idsOnPage(third);
  assert.equal(a.length, 12);
  assert.equal(b.length, 12);
  assert.ok(c.length > 0);
  assert.ok(b.every(id => !a.includes(id)));
  assert.ok(c.every(id => !a.includes(id) && !b.includes(id)));
});

test('pagination rejects malformed values and clamps against matching results', () => {
  for (const page of ['', '0', '-1', '2junk', '2.5', 'Infinity', '1e3', '9999999999999999999999']) assert.equal(stateFor({ page }).page, 1, page);
  assert.equal(stateFor({ page: ['2', '3'] }).page, 2);
  assert.equal(stateFor({ page: '999' }).page, stateFor({}).totalPages);
  const filtered = stateFor({ q: 'صيدلية', page: '999' });
  assert.equal(filtered.totalPages, Math.max(1, Math.ceil(resultsFor(filtered).length / 12)));
  assert.equal(filtered.page, filtered.totalPages);
});

test('scoped query inputs cannot replace locked category or locality', () => {
  const state = resolveDirectoryState({ category: 'الطب والصحة', locality: 'طوخ', page: '2' }, local, { ...scope, lockedCategory: 'التعليم' });
  assert.equal(state.category, 'التعليم');
  assert.equal(state.locality, 'بشلاو');
  assert.equal(state.hasFilters, false);
  assert.ok(directoryResults(local, state, []).every(item => item.category === 'التعليم' && item.locality === 'بشلاو'));
  assert.equal(stateFor({ sort: 'unsupported', category: 'unknown' }).hasFilters, false);
  assert.equal(stateFor({ q: '   ' }).hasFilters, false);
});

test('each unfiltered page has its own canonical and sequential navigation', () => {
  const path = '/villages/بشلاو/';
  const meta = directoryPageMetadata({ robots: { index: true, follow: true } }, path, stateFor({ page: '2' }));
  assert.equal(meta.alternates.canonical, path + '?page=2');
  assert.ok(meta.openGraph.url.endsWith(path + '?page=2'));
  assert.equal(meta.pagination.previous, path);
  assert.equal(meta.pagination.next, path + '?page=3');
  assert.equal(meta.robots.index, true);
  assert.equal(directoryPageHref(path, 1), path);
  assert.equal(directoryPageHref(path.slice(0, -1), 2), path + '?page=2');
});

test('query and sort variations stay noindex without changing thin-record eligibility', () => {
  for (const params of [{ q: 'صيدلية' }, { sort: 'name' }, { category: 'الطب والصحة' }]) {
    const state = stateFor(params);
    const meta = directoryPageMetadata({}, '/villages/بشلاو/', state);
    assert.equal(meta.robots.index, false);
    assert.equal(meta.robots.follow, true);
    assert.equal(meta.alternates.canonical, '/villages/بشلاو/');
    assert.equal(meta.pagination, undefined);
  }
  const thin = directoryPageMetadata({ robots: { index: false, follow: true } }, '/villages/بشلاو/', stateFor({}));
  assert.equal(thin.robots.index, false);
});

test('sort order and matched-result counts use the same selector on server and client', () => {
  const named = stateFor({ sort: 'name' });
  const a = resultsFor(named);
  assert.deepEqual(Array.from(a, item => item.id), Array.from([...a].sort((x,y) => x.name.localeCompare(y.name, 'ar')), item => item.id));
  const ranked = local.map(item => ({ item, rank: 0 }));
  assert.deepEqual(Array.from(stateModule.filterDirectoryMatches(ranked, named), item => item.id), Array.from(a, item => item.id));
});

test('result selection does not reintroduce hidden records or discard published owner records', () => {
  const owner = { ...local[0], id: 'owner:fixture', name: 'نشاط تجريبي منشور' };
  const visible = [...local.slice(1), owner];
  const state = resolveDirectoryState({}, visible, scope);
  const result = directoryResults(visible, state, []);
  assert.ok(result.some(item => item.id === owner.id));
  assert.ok(!result.some(item => item.id === local[0].id));
});

test('the confirmed Al Fath grocery subcategory appears once without unrelated retailers', () => {
  const activities = loadModule('./lib/activity-landings');
  const activity = activities.activityLandings.find(item => item.name === 'سوبر ماركت وبقالات نقادة');
  const alfath = data.businesses.find(item => item.id === 'directory:bashlaw-mahallat-alfath');
  assert.ok(alfath);
  const unrelated = { ...alfath, id: 'fixture:clothing', subcategory: 'ملابس وأقمشة' };
  const matches = activities.getBusinessesForActivity(activity, [alfath, unrelated]);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, alfath.id);
});

test('query suffix encodes values and forwards only supported query keys', () => {
  const suffix = directoryQuerySuffix({ q: ['a&b#', 'ignored'], page: '2', unsupported: 'private' });
  const parsed = new URL('https://example.test/' + suffix);
  assert.equal(parsed.searchParams.get('q'), 'a&b#');
  assert.equal(parsed.searchParams.get('page'), '2');
  assert.equal(parsed.searchParams.has('unsupported'), false);
  assert.equal(parsed.hash, '');
});
