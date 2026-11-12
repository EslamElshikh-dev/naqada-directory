// Run after npm run build. Starts a local production Next server with synthetic
// upstreams. Never calls the deployed webhook or modifies the live database.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = await mkdtemp(path.join(tmpdir(), 'naqada-cache-qa-'));
const fixturePath = path.join(dir, 'fixture.json'), readsPath = path.join(dir, 'reads.jsonl');
const secret = 'synthetic-local-cache-test-secret-not-for-production';
const port = Number(process.env.NAQADA_CACHE_QA_PORT || 3197);
const origin = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let fixture = { jobs: [], curated: {}, owners: [] };
const save = () => writeFile(fixturePath, JSON.stringify(fixture));
await save(); await writeFile(readsPath, '');
const server = spawn(process.execPath, ['--import', path.resolve('tests/helpers/scoped-cache-fetch.mjs'), 'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, CONTENT_REVALIDATION_SECRET: secret, NAQADA_CACHE_FIXTURE: fixturePath, NAQADA_CACHE_READS: readsPath, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = ''; server.stdout.on('data', data => { logs += data; }); server.stderr.on('data', data => { logs += data; });
const read = async route => {
  const response = await fetch(origin + route);
  assert.equal(response.status, 200, route);
  return response.text();
};
const revalidate = async scopes => {
  const response = await fetch(origin + '/api/revalidate/', { method: 'POST', headers: { authorization: 'Bearer ' + secret }, body: JSON.stringify({ scopes }) });
  assert.equal(response.status, 200, await response.text());
};
const reads = async () => (await readFile(readsPath, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const unrelatedReads = rows => rows.filter(row => !row.path.includes('naqada_job')).length;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { await read('/robots.txt'); ready = true; break; } catch { await sleep(500); }
  }
  assert.ok(ready, logs);
  await revalidate(['business', 'owner-listings', 'jobs', 'news', 'news-archive', 'article', 'role_model']);
  // Drain the initial all-scope delayed purge before the isolation assertions.
  await sleep(21_000);
  const routes = ['/directory/', '/blog/', '/role-models/'];
  for (const route of routes) await read(route);
  const oldJobs = await read('/jobs/');
  assert.ok(!oldJobs.includes('SCOPED_CACHE_SYNTHETIC_JOB'));
  const before = unrelatedReads(await reads());
  fixture.jobs = [{ id: '00000000-0000-4000-8000-000000000001', kind: 'offer', origin: 'community', title: 'SCOPED_CACHE_SYNTHETIC_JOB', organization: 'Synthetic', locality: 'مدينة نقادة', governorate: 'قنا', field: 'خدمات', description: 'Synthetic isolated QA job for cache testing only.', experience: null, work_type: 'full-time', contact_kind: 'email', contact_value: 'qa@example.invalid', source_name: null, source_url: null, published_at: '2026-11-12T00:00:00Z', expires_at: '2099-01-01T00:00:00Z' }];
  await save(); await revalidate(['jobs']);
  assert.ok((await read('/jobs/')).includes('SCOPED_CACHE_SYNTHETIC_JOB'), 'New job must appear in real ISR HTML');
  assert.ok((await read('/api/jobs/')).includes('SCOPED_CACHE_SYNTHETIC_JOB'), 'New job must appear in headlines');
  for (const route of routes) await read(route);
  assert.equal(unrelatedReads(await reads()), before, 'Unrelated content readers must remain cached');
  fixture.jobs = []; await save(); await revalidate(['jobs']);
  assert.ok(!(await read('/jobs/')).includes('SCOPED_CACHE_SYNTHETIC_JOB'), 'Withdrawn job must disappear from real ISR HTML');
  assert.ok(!(await read('/api/jobs/')).includes('SCOPED_CACHE_SYNTHETIC_JOB'), 'Withdrawn job must disappear from headlines');
  fixture.curated.news = [{ kind: 'news', slug: 'editor-cache-fixture-news', origin: 'original', status: 'published', payload: { title: 'SCOPED_CACHE_SYNTHETIC_NEWS', summary: 'Synthetic isolated cache test news summary.', body: 'Synthetic news content used only by the local production-server regression test.', category: 'محليات' }, updatedAt: '2026-11-12T00:00:00Z' }];
  await save(); await revalidate(['news']);
  assert.ok((await read('/news/')).includes('SCOPED_CACHE_SYNTHETIC_NEWS'), 'New original news must appear in real ISR HTML');
  assert.ok((await read('/api/news/')).includes('SCOPED_CACHE_SYNTHETIC_NEWS'), 'News ticker must refresh');
  assert.ok((await read('/news/editor-cache-fixture-news/')).includes('SCOPED_CACHE_SYNTHETIC_NEWS'));
  fixture.curated.news[0].status = 'hidden'; await save(); await revalidate(['news']);
  assert.ok(!(await read('/news/')).includes('SCOPED_CACHE_SYNTHETIC_NEWS'), 'Hidden news must leave the collection');
  assert.ok(!(await read('/api/news/')).includes('SCOPED_CACHE_SYNTHETIC_NEWS'), 'Hidden news must leave the ticker');
  assert.equal((await fetch(origin + '/news/editor-cache-fixture-news/')).status, 404, 'Hidden news detail must return 404');
  const beforeDelayedPurge = unrelatedReads(await reads());
  await sleep(21_000);
  for (const route of routes) await read(route);
  assert.equal(unrelatedReads(await reads()), beforeDelayedPurge, 'Delayed purge must also leave unrelated content cached');
  assert.ok(!(await read('/jobs/')).includes('SCOPED_CACHE_SYNTHETIC_JOB'));
  console.log('PASS: production Next ISR new jobs/news, withdrawal, hidden-news 404, API freshness and immediate/delayed scope isolation. All upstream fetches were synthetic.');
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { server.once('exit', resolve); setTimeout(resolve, 5000).unref(); });
  await rm(dir, { recursive: true, force: true });
}
