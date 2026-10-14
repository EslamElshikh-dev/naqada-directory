import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanGlobalStyles } from '../scripts/global-style-cleanup.mjs';

test('retired positive selectors are removed while live alternatives and negation remain', () => {
  const input = '.old:hover,.live{color:red}.live:not(.old){color:blue}:is(.old,.live){margin:0}[title=".old"]{padding:0}';
  const result = cleanGlobalStyles(input, new Set(['old']));
  assert.doesNotMatch(result.css, /\.old:hover/);
  assert.match(result.css, /\.live\{color:red\}/);
  assert.match(result.css, /\.live:not\(\.old\)/);
  assert.match(result.css, /:is\(\.old,\.live\)/);
  assert.match(result.css, /\[title="\.old"\]/);
});

test('identical declarations can be removed across overrides without removing fallback values', () => {
  const result = cleanGlobalStyles('.live{color:red;display:block;display:subgrid}.live{color:blue}.live{color:red}', new Set());
  assert.equal((result.css.match(/color:red/g) || []).length, 1);
  assert.match(result.css, /color:blue/);
  assert.match(result.css, /display:block;display:subgrid/);
});

test('conditional declarations, importance and animation keyframes remain independent', () => {
  const result = cleanGlobalStyles('.live{color:red!important}@media(max-width:700px){.live{color:red}}@media(min-width:701px){.live{color:red}}@keyframes fade{from{opacity:0}to{opacity:1}}', new Set());
  assert.equal((result.css.match(/color:red/g) || []).length, 3);
  assert.match(result.css, /@keyframes fade\{from\{opacity:0\}to\{opacity:1\}\}/);
});
