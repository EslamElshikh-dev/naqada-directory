import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/notifications.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports, require: () => ({}) });
const notice = (id, occurredAt) => ({ id, occurredAt, href: '/account/', title: 'طلب', label: 'قرار', detail: '', tone: 'mint' });

test('personal decisions and moderation notices combine newest first without duplicates', () => {
  const own = [notice('old', '2026-10-01T08:00:00Z'), notice('published', '2026-10-02T08:00:00Z')];
  const queue = [notice('pending', '2026-10-02T09:00:00Z'), own[0]];
  assert.deepEqual(Array.from(exports.mergePersonalNotices(own, queue), (item) => item.id), ['pending', 'published', 'old']);
  assert.equal(own[0].id, 'old');
  assert.equal(queue.length, 2);
});

test('ordinary member feed works without moderator notices and bounds the history', () => {
  const feed = Array.from({ length: 120 }, (_, index) => notice(`decision-${index}`, new Date(1_700_000_000_000 + index * 1000).toISOString()));
  const result = exports.mergePersonalNotices(feed, []);
  assert.equal(result.length, 100);
  assert.equal(result[0].id, 'decision-119');
  assert.equal(result[99].id, 'decision-20');
});
