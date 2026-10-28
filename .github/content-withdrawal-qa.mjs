import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, openSync, closeSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const folder = mkdtempSync(join(tmpdir(), 'naqada-withdrawal-'));
const base = 'http://127.0.0.1:3049';
const secret = randomBytes(32).toString('hex');
const control = value => writeFileSync(join(folder, 'control.json'), JSON.stringify(value));
mkdirSync('artifacts', { recursive: true });
const log = openSync('artifacts/content-withdrawal-server.log', 'w');
control({ hidden: false, hold: false });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3049'], {
  env: { ...process.env, CONTENT_REVALIDATION_SECRET: secret, NAQADA_WITHDRAWAL_FIXTURE: folder,
    NODE_OPTIONS: '--import=' + resolve('.github/withdrawal-read-fixture.mjs') }, stdio: ['ignore', log, log],
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) {
  for (let i = 0; i < 150; i++) { if (await check()) return; await sleep(100); }
  throw Error('Timed out waiting for ' + label);
}
try {
  await until(async () => { try { return (await fetch(base + '/manifest.webmanifest')).ok; } catch { return false; } }, 'server');
  const legacy = await fetch(base + '/activity/11111111-1111-4111-8111-111111111111/', { redirect: 'manual' });
  assert.equal(legacy.status, 308);
  const url = new URL(legacy.headers.get('location'), base);
  const initial = await fetch(url); assert.equal(initial.status, 200); await initial.text();
  const initialImage = await fetch(new URL(url.href + 'opengraph-image/'));
  assert.equal(initialImage.status, 200); assert.match(initialImage.headers.get('cache-control') || '', /no-store/); await initialImage.arrayBuffer();
  const beforeCount = await fetch(base + '/api/public-counts/').then(response => response.json());
  control({ hidden: false, hold: true });
  const earlier = fetch(url).then(async response => ({ status: response.status, html: await response.text() }));
  await until(() => existsSync(join(folder, 'started')), 'an old read in flight');
  control({ hidden: true, hold: false });
  const invalidated = await fetch(base + '/api/revalidate/', { method: 'POST', headers: { authorization: 'Bearer ' + secret } });
  assert.equal(invalidated.status, 200); await invalidated.json();
  async function hidden() {
    const response = await fetch(url), html = await response.text();
    assert.equal(response.status, 404);
    assert.ok(!html.includes('<h1>نشاط اختبار سحب المحتوى</h1>'));
    assert.match(html, /noindex/);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
  }
  await hidden();
  const afterCount = await fetch(base + '/api/public-counts/').then(response => response.json());
  assert.equal(afterCount.businesses, beforeCount.businesses - 1);
  writeFileSync(join(folder, 'release'), '1');
  const old = await earlier; assert.equal(old.status, 200);
  await hidden();
  const image = await fetch(new URL(url.href + 'opengraph-image/')); assert.equal(image.status, 404);
  const directory = await fetch(base + '/directory/').then(response => response.text());
  const listingPath = directory.match(/href="(\/listing\/[^"?]+)"/)?.[1];
  assert.ok(listingPath, 'A published foundation listing must be available');
  const foundation = await fetch(new URL(listingPath, base)); assert.equal(foundation.status, 200); await foundation.text();
  const slug = decodeURIComponent(listingPath.split('/')[2]);
  control({ hidden: true, hold: false, hiddenSlug: slug });
  const hiddenFoundation = await fetch(new URL(listingPath, base));
  assert.equal(hiddenFoundation.status, 404); assert.match(await hiddenFoundation.text(), /noindex/);
  const result = { passed: true, syntheticData: true, externalWrites: 0, concurrentWithdrawal: '404 before and after the older read finishes', hiddenImage: image.status, hiddenFoundation: hiddenFoundation.status, freshCounterDecreased: true };
  writeFileSync('artifacts/content-withdrawal.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  writeFileSync(join(folder, 'release'), '1');
  server.kill('SIGTERM');
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(3000)]);
  if (server.exitCode === null) server.kill('SIGKILL');
  closeSync(log); rmSync(folder, { recursive: true, force: true });
}
