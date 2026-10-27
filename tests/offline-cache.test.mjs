import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const policy = vm.runInNewContext(source + '\n;({navigationKind, asset, victims, MAX_BYTES, MAX_ENTRIES})', { URL, Response, Headers, AbortController, setTimeout, clearTimeout,
  self: { location: { origin: 'https://naqada-directory.vercel.app' }, addEventListener() {} } });
const url = path => new URL(path, 'https://naqada-directory.vercel.app');
test('offline storage excludes private routes, APIs and query pages', () => {
  for (const path of ['/account/', '/admin/', '/claim/example/', '/api/photo/', '/search/?q=clinic', '/listing/a/?preview=1']) assert.equal(policy.navigationKind(url(path)), null);
  assert.equal(policy.navigationKind(new URL('https://example.com/listing/a/')), null);
  assert.equal(policy.navigationKind(url('/listing/a/')), 'listing');
  assert.equal(policy.navigationKind(url('/')), 'pinned');
  assert.equal(policy.asset(url('/_next/image/?url=' + encodeURIComponent('/api/account/avatar'))), false);
  assert.equal(policy.asset(url('/_next/image/?url=' + encodeURIComponent('https://lh3.googleusercontent.com/profile'))), false);
  assert.equal(policy.asset(url('/_next/image/?url=' + encodeURIComponent('/images/categories/pharmacies-v1.webp'))), true);
  assert.equal(policy.asset(url('/_next/static/media/font.woff2')), true);
});
test('offline history retains the newest 20 activities and 10 other pages with pinned essentials', () => {
  const index = { root: { kind: 'pinned', bytes: 100, at: 0 }, emergency: { kind: 'pinned', bytes: 100, at: 0 } };
  for (let i=0;i<30;i++) index['listing'+i] = { kind: 'listing', bytes: 100, at: i };
  for (let i=0;i<15;i++) index['public'+i] = { kind: 'public', bytes: 100, at: i };
  const gone = new Set(policy.victims(index));
  assert.equal(Object.keys(index).filter(k => k.startsWith('listing') && !gone.has(k)).length, 20);
  assert.equal(Object.keys(index).filter(k => k.startsWith('public') && !gone.has(k)).length, 10);
  assert.ok(gone.has('listing0') && !gone.has('listing29') && !gone.has('root') && !gone.has('emergency'));
});
test('offline eviction enforces byte and entry budgets without dropping essentials', () => {
  const index = { root: { kind: 'pinned', bytes: 100, at: 0 } };
  for (let i=0;i<200;i++) index['asset'+i] = { kind: 'asset', bytes: 200000, at: i };
  const gone = new Set(policy.victims(index));
  const kept = Object.entries(index).filter(([key]) => !gone.has(key));
  assert.ok(kept.length <= policy.MAX_ENTRIES);
  assert.ok(kept.reduce((sum,[,entry])=>sum+entry.bytes,0) <= policy.MAX_BYTES);
  assert.ok(!gone.has('root'));
});
