import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function tracker({ storageBlocked = false } = {}) {
  let clock = 1_000_000;
  const requests = [];
  const storage = new Map();
  const context = vm.createContext({
    window: { sessionStorage: {
      getItem(key) { if (storageBlocked) throw Error('blocked'); return storage.get(key) || null; },
      setItem(key, value) { if (storageBlocked) throw Error('blocked'); storage.set(key, value); },
    } },
    Date: class extends Date { static now() { return clock; } },
    fetch: async (_url, options) => { requests.push(JSON.parse(options.body)); return {}; },
  });
  function load(file, dependencies = {}) {
    const record = { exports: {} };
    Object.assign(context, { module: record, exports: record.exports, require: (name) => dependencies[name] });
    vm.runInContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    }).outputText, context);
    return record.exports;
  }
  const analytics = load('../lib/analytics-client.ts');
  const tracking = load('../lib/search-tracking.ts', { './analytics-client': analytics });
  return { track: tracking.trackCompletedSearch, requests, advance: (ms) => { clock += ms; } };
}

test('searches have mutually exclusive outcomes and never send successful query text', () => {
  const t = tracker();
  t.track({ query: 'صيدلية', results: 8 });
  t.track({ query: 'مركز تخاطب', results: 0, locality: 'طوخ' });
  assert.equal(t.requests.length, 2);
  assert.equal(t.requests[0].eventType, 'search');
  assert.equal(t.requests[0].queryText, undefined);
  assert.equal(t.requests[1].eventType, 'zero_results');
  assert.equal(t.requests[1].queryText, 'مركز تخاطب');
  assert.equal(t.requests[1].locality, 'طوخ');
});

test('duplicate submissions are suppressed while different filters and later searches remain measurable', () => {
  const t = tracker();
  const search = { query: '  مركز   تخاطب ', results: 0, category: 'الطب والصحة', locality: 'بشلاو' };
  assert.equal(t.track(search), true);
  assert.equal(t.track({ ...search, query: 'مركز تخاطب' }), false);
  assert.equal(t.track({ ...search, locality: 'طوخ' }), true);
  assert.equal(t.track({ ...search, category: 'التعليم' }), true);
  t.advance(10_001);
  assert.equal(t.track(search), true);
  assert.equal(t.requests.length, 4);
});

test('filter-only browsing, private input and incomplete one-letter searches do not enter the counters', () => {
  const t = tracker();
  for (const query of ['', ' ', 'ك', '01012345678', 'person@example.com', '\uFFFD']) {
    assert.equal(t.track({ query, results: 0, category: 'الطب والصحة' }), false);
  }
  assert.equal(t.track({ query: 'صيدلية', results: -1 }), false);
  assert.equal(t.requests.length, 0);
});

test('searches remain deduplicated when browser storage is disabled', () => {
  const t = tracker({ storageBlocked: true });
  assert.equal(t.track({ query: 'بيت النحل', results: 0 }), true);
  assert.equal(t.track({ query: 'بيت النحل', results: 0 }), false);
  assert.equal(t.requests.length, 1);
});
