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
});

test('registry discovery excludes unpublished or weak research records', () => {
  const sample = data.families[0];
  assert.equal(family.buildFamilySearchPages([
    { ...sample, locality: 'موضع غير موثق', status: 'manual_review' },
    { ...sample, locality: 'موضع غير موثق', grade: 'C' },
  ]).length, 0);
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
