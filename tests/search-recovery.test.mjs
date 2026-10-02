import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';

const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS };
function load(path, dependency) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: options,
  }).outputText, { exports, require: () => dependency });
  return exports;
}
const site = load('../lib/site.ts');
const ranking = load('../lib/search-ranking.ts', site);
const data = readdirSync(new URL('../data/', import.meta.url))
  .filter((file) => /^businesses-\d+\.json$/.test(file))
  .flatMap((file) => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8')));
function matches(query) {
  return data.filter((item) => ranking.rankSearchFields({
    title: item.name, category: item.category, subcategory: item.subcategory,
    locality: item.locality, address: item.address, auxiliary: item.normalizedName,
  }, query) >= 0);
}
test('missed local searches recover the existing verified listings', () => {
  for (const query of ['تلفونات', 'حلوانى', 'تسالى', 'محلاتوالاقمشة', 'حضانة النجوم الصغيرة', 'جمعيه الشبات المسلمات بنقاده', 'صوص الثانوية']) {
    assert.ok(matches(query).length > 0, query);
  }
});
test('joined words normalize without inventing wholesale availability', () => {
  assert.equal(ranking.prepareSearchQuery('اماكنجمله ادوات منزليه').normalizedQuery, 'جمله ادوات منزليه');
  assert.equal(matches('اماكنجمله ادوات منزليه').length, 0);
});
