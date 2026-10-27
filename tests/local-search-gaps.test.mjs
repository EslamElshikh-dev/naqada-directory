import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const nodeRequire = createRequire(import.meta.url);
const modules = new Map();
function loadModule(name, parent = root) {
  const target = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(parent, name);
  const path = [target, `${target}.ts`, `${target}.json`].find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`Missing test dependency: ${name}`);
  if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'));
  if (modules.has(path)) return modules.get(path).exports;
  const record = { exports: {} };
  modules.set(path, record);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, {
    module: record, exports: record.exports, URLSearchParams,
    require: (dependency) => dependency.startsWith('.') || dependency.startsWith('@/')
      ? loadModule(dependency, dirname(path)) : nodeRequire(dependency),
  }, { filename: path });
  return record.exports;
}

const data = loadModule('./lib/data');
const search = loadModule('./lib/site-search');
const growth = loadModule('./lib/growth-priority');
const family = loadModule('./lib/family-search');
const research = loadModule('./lib/search-gap-research');
const jobSearch = loadModule('./lib/job-search');
const gaps = loadModule('./lib/search-gaps');

test('family questions find the documented locality registry in both search paths', () => {
  for (const query of ['ماهى عائلات طوخ', 'ما هي عائلات طوخ', 'ما هى عايلات طوخ']) {
    const result = search.searchSite(query, 1)[0];
    assert.equal(result.title, 'عائلات طوخ');
    assert.equal(new URL(result.href, 'https://example.com').searchParams.get('locality'), 'طوخ');
    assert.equal(family.searchFamilyPages(query, data.familySearchPages)[0].href, result.href);
    assert.equal(growth.isSearchGapOpen(query), false);
  }
  assert.equal(growth.isSearchGapOpen('ماهى عائلات طنطا'), true);
  assert.equal(search.searchSite('ماهى عائلات طنطا', 1).length, 0);
  assert.equal(family.searchFamilyPages('ماهي عائلات نقادة', data.familySearchPages)[0].href, '/families');
  const registryResults = search.searchSite('ماهي عائلات نقادة', 30);
  assert.ok(registryResults.length > 0);
  assert.ok(registryResults.every((item) => item.href === '/families' || item.href.startsWith('/families?')));
  assert.equal(search.searchSite('ماهي عائلات نقادة', 30, ['listing']).length, 0);
});

test('cashier search routes to real job filtering and never drops the profession', () => {
  for (const query of ['كشير بسوبر ماركت', 'كاشير بسوبر ماركت', 'cashier']) {
    const result = search.searchSite(query, 1)[0];
    const destination = new URL(result.href, 'https://example.com');
    assert.equal(destination.pathname, '/jobs');
    assert.equal(destination.searchParams.get('view'), 'all');
    assert.equal(destination.searchParams.get('q'), 'كاشير');
    assert.equal(jobSearch.jobMatchesSearch('مطلوب كشير سوبر ماركت', 'كاشير'), true);
    assert.equal(jobSearch.jobMatchesSearch('كاشير بأحد المحلات', 'كشير'), true);
    assert.equal(jobSearch.jobMatchesSearch('مطلوب سائق', 'كاشير'), false);
    assert.equal(search.recoverSiteSearch(query).length, 0);
    assert.equal(growth.isSearchGapOpen(query), false);
  }
  assert.equal(jobSearch.jobSearchIntent('تخاطب'), null);
  assert.equal(jobSearch.jobSearchIntent('مطلوب سباك للبيت'), null);
  assert.equal(new URL(search.searchSite('باحث عن عمل', 1)[0].href, 'https://example.com').searchParams.get('view'), 'seeker');
});

test('gap grouping preserves historical event volume, variants, and distinct filter contexts', () => {
  const rows = [
    { query: 'تخاطب', count: 2, category: null, locality: null, lastSeenAt: '2026-10-23T10:00:00Z' },
    { query: 'مركز تخاطب', count: 1, category: 'all', locality: 'all', lastSeenAt: '2026-10-24T10:00:00Z' },
    { query: 'مركز تخاطب', count: 1, category: 'الطب والصحة', locality: 'طوخ', lastSeenAt: '2026-10-24T11:00:00Z' },
  ];
  const grouped = gaps.groupSearchGaps(rows);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].query, 'تخاطب');
  assert.equal(grouped[0].count, 3);
  assert.equal(grouped[0].lastSeenAt, '2026-10-24T10:00:00Z');
  assert.equal(grouped[0].variants.length, 2);
  assert.equal(new Set(grouped.map((row) => row.id)).size, 2);
  assert.equal(grouped.reduce((sum, row) => sum + row.count, 0), rows.reduce((sum, row) => sum + row.count, 0));
  assert.equal(rows[0].count, 2, 'do not mutate raw analytics');
  assert.notEqual(gaps.searchGapKey(rows[0]), gaps.searchGapKey({ ...rows[0], locality: 'مركز نقادة' }));
});

test('related business names stay separate, while known typing errors are grouped within their context', () => {
  assert.equal(gaps.groupSearchGaps([
    { query: 'اقمشة ابو الشيخ فى نقادة', count: 1 },
    { query: 'اولتد الشبخ للقماش', count: 2 },
  ]).length, 2);
  const sameName = gaps.groupSearchGaps([
    { query: 'اولتد الشبخ للقماش', count: 2 },
    { query: 'أولاد الشيخ للقماش', count: 1 },
  ]);
  assert.equal(sameName.length, 1);
  assert.equal(sameName[0].count, 3);
});

test('closing a gap respects the actual requested category and locality', () => {
  const sample = { ...data.businesses[0], name: 'مركز تخاطب للاختبار', normalizedName: 'مركز تخاطب للاختبار',
    description: '', seoKeywords: [], category: 'الطب والصحة', subcategory: 'تخاطب', locality: 'طوخ', address: 'طوخ' };
  assert.equal(growth.isSearchGapOpen('تخاطب', [sample]), false);
  assert.equal(growth.isSearchGapOpen('تخاطب', [sample], { locality: 'طوخ', category: 'الطب والصحة' }), false);
  assert.equal(growth.isSearchGapOpen('تخاطب', [sample], { locality: 'بشلاو' }), true);
  assert.equal(growth.isSearchGapOpen('تخاطب', [sample], { category: 'التعليم' }), true);
  assert.equal(growth.getOpenSearchGaps([
    { query: 'تخاطب', count: 2, locality: 'بشلاو' },
    { query: 'كشير بسوبر ماركت', count: 2 },
    { query: 'تخاطب', count: 1, locality: 'طوخ' },
  ], [sample]).length, 1);
});

test('recovery preserves provider names, services, and current publication status', () => {
  for (const query of ['مركز تخاطب', 'معمل دكتور لاب', 'اولتد الشبخ للقماش', 'دكتور عاطف', 'مستشفى تخصصي']) {
    const suggestions = search.recoverSiteSearch(query);
    for (const suggestion of suggestions) {
      assert.ok(!['مركز', 'دكتور', 'معمل دكتور', 'أولاد الشيخ', 'مستشفى'].includes(suggestion.query), `${query}: ${suggestion.query}`);
    }
  }
  const sample = { ...data.businesses[0], name: 'مركز تواصل', normalizedName: 'مركز تواصل', description: '',
    seoKeywords: [], category: 'الطب والصحة', subcategory: 'تخاطب', locality: 'طوخ', address: 'طوخ' };
  const suggestions = search.recoverSiteSearch('مركز تواسل', ['listing'], 4, [sample]);
  assert.ok(suggestions.some((item) => item.query.includes('تواصل')));
  for (const suggestion of search.recoverSiteSearch('مركز تواسل', ['listing'], 4, [])) {
    assert.equal(search.searchSite(suggestion.query, 1, ['listing'], []).length > 0, true);
  }
});

test('registry discovery excludes unpublished or weak research records', () => {
  const sample = data.families[0];
  assert.equal(family.buildFamilySearchPages([
    { ...sample, locality: 'موضع غير موثق', status: 'manual_review' },
    { ...sample, locality: 'موضع غير موثق', grade: 'C' },
  ]).length, 0);
  assert.equal(family.buildFamilySearchPages([{ ...sample, grade: 'A/B' }]).length, 2);
  assert.equal(family.buildFamilySearchPages([{ ...sample, grade: 'A/B', status: 'historical_ready' }]).length, 2);
  assert.match(data.familySearchPages.find((item) => item.href === '/families').subtitle, /30/);
  assert.match(data.families.find((item) => item.locality === 'طوخ').scope, /جزئي/);
});

test('Buraq resolves to the sourced Khattara record without invented contact data', () => {
  const result = search.searchSite('اين محل البراق', 1, ['listing'])[0];
  assert.equal(result.title, 'البراق للأدوات الكهربائية');
  const record = data.businesses.find((item) => result.href === `/listing/${item.slug}`);
  assert.equal(record.locality, 'الخطارة');
  assert.equal(record.phone, null);
  assert.equal(record.hours, null);
  assert.equal(record.status, 'ready_with_caution');
  assert.equal(growth.isSearchGapOpen('اين محل البراق'), false);
  assert.equal(growth.isSearchGapOpen('اين محل البراق', data.businesses.filter((item) => item.id !== record.id)), true);
});

test('verified Madina shop is searchable while the ambiguous Aswaq brand stays open', () => {
  const result = search.searchSite('سنتر المدينة', 1, ['listing'])[0];
  assert.match(result.title, /^سنتر المدينة/);
  assert.equal(growth.isSearchGapOpen('أسواق المدينه'), true);
  assert.equal(research.getSearchGapResearch('أسواق المدينه').relatedQuery, 'سنتر المدينة');
});

test('unverified names and services remain reviewable instead of matching unrelated businesses', () => {
  for (const query of [
    'اولتد الشبخ للقماش', 'اقمشة ابو الشيخ فى نقادة', 'مستشفى تخصصي',
    'محل موبايلات بتشتري تابلت المدرسة', 'دكتور عاطف', 'عاطف',
  ]) {
    assert.equal(growth.isSearchGapOpen(query), true, query);
    assert.ok(research.getSearchGapResearch(query)?.needed, query);
  }
  assert.equal(search.searchSite('اولتد الشبخ للدهانات', 1, ['listing'])[0].title, 'محلات أولاد الشيخ للدهانات');
});
