import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, openSync, closeSync, writeFileSync, rmSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = process.cwd();
const temporary = mkdtempSync(join(tmpdir(), 'naqada-withdrawal-'));
const state = join(temporary, 'state.json');
const started = state + '.started';
mkdirSync('artifacts/withdrawal', { recursive: true });
const log = openSync('artifacts/withdrawal/server.log', 'w');
const secret = randomBytes(32).toString('hex');
const base = 'http://127.0.0.1:3048';
writeFileSync(state, JSON.stringify({ mode: 'visible' }));
rmSync(started, { force: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3048'], {
  cwd: root, env: { ...process.env, NODE_OPTIONS: '--import=./.github/qa-withdrawal-fetch.mjs', NAQADA_QA_WITHDRAWAL_STATE: state, CONTENT_REVALIDATION_SECRET: secret },
  stdio: ['ignore', log, log],
});
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  const legacy = await fetch(base + '/activity/00000000-0000-4000-8000-000000000202/', { redirect: 'manual' });
  assert.equal(legacy.status, 308);
  const target = new URL(legacy.headers.get('location'), base).href;
  const before = await fetch(target);
  assert.equal(before.status, 200);
  assert.ok((await before.text()).includes('اختبار السحب المحلي'));
  writeFileSync(state, JSON.stringify({ mode: 'hold' }));
  const oldRequest = fetch(target).then(async response => ({ status: response.status, body: await response.text() }));
  for (let i = 0; i < 100 && !existsSync(started); i++) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(existsSync(started), 'The old request did not reach the fixture');
  writeFileSync(state, JSON.stringify({ mode: 'hidden' }));
  const invalidated = await fetch(base + '/api/revalidate/', { method: 'POST', headers: { authorization: 'Bearer ' + secret } });
  assert.equal(invalidated.status, 200);
  assert.equal((await fetch(target)).status, 404);
  writeFileSync(state, JSON.stringify({ mode: 'hidden', release: true }));
  assert.equal((await oldRequest).status, 200);
  const after = await fetch(target);
  assert.equal(after.status, 404);
  assert.ok(!(await after.text()).includes('<h1>اختبار السحب المحلي</h1>'));
  assert.equal((await fetch(target + 'opengraph-image/')).status, 404);
  const result = { productionWrites: 0, fixtureOnly: true, before: 200, duringOldRead: 404, afterOldRead: 404, hiddenShareImage: 404 };
  writeFileSync('artifacts/withdrawal/results.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  writeFileSync(state, JSON.stringify({ mode: 'hidden', release: true }));
  server.kill('SIGTERM');
  if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve));
  closeSync(log);
  rmSync(temporary, { recursive: true, force: true });
}
