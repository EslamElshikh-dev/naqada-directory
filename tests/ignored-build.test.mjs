import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/ignore-vercel-build.mjs', import.meta.url));

function repository(t) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'naqada-build-guard-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q', '-b', 'fixture');
  git('config', 'user.name', 'Build Guard Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  const write = (name, value = 'fixture\n') => {
    mkdirSync(path.dirname(path.join(cwd, name)), { recursive: true });
    writeFileSync(path.join(cwd, name), value);
  };
  const commit = () => { git('add', '--all'); git('commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD'); };
  write('app/page.tsx'); write('README.md'); write('docs/cache.md');
  const previous = commit();
  const run = (overrides = {}) => {
    const env = { ...process.env, VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_PROJECT_ID: 'prj_FlW8Tu9Ym4pylF6SdrNG2JYBtKzI',
      VERCEL_GIT_PROVIDER: 'github', VERCEL_GIT_REPO_ID: '1355551665', VERCEL_GIT_COMMIT_REF: 'fixture',
      VERCEL_GIT_PREVIOUS_SHA: previous, VERCEL_GIT_COMMIT_SHA: git('rev-parse', 'HEAD'), NAQADA_FORCE_BUILD: '', ...overrides };
    const result = spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.error, undefined);
    return { status: result.status, log: JSON.parse(result.stdout.trim()) };
  };
  return { cwd, git, write, commit, previous, run };
}

test('a verified existing preview skips only documentation and tests, including deleted files', t => {
  const r = repository(t);
  r.write('README.md', 'Updated README\n'); r.write('docs/nested/guide.md'); r.write('tests/example.test.mjs');
  rmSync(path.join(r.cwd, 'docs/cache.md'));
  r.commit();
  assert.deepEqual(r.run(), { status: 0, log: { event: 'NAQADA_BUILD_DECISION', decision: 'skip', reason: 'skip_preview_docs_tests_only' } });
});

test('production and unknown environments always build even for documentation-only changes', t => {
  const r = repository(t); r.write('docs/guide.md'); r.commit();
  for (const value of ['production', '', 'staging', 'development']) assert.equal(r.run({ VERCEL_ENV: value }).status, 1);
  assert.equal(r.run({ NAQADA_FORCE_BUILD: '1' }).status, 1);
});

test('application, content, asset, dependency, configuration and guard changes always build', t => {
  for (const name of ['app/page.tsx', 'lib/site.ts', 'components/card.tsx', 'public/sw.js', 'data/catalog.json', 'package-lock.json', 'next.config.ts', 'vercel.json', 'scripts/ignore-vercel-build.mjs', '.github/workflows/ci.yml', 'README.ts']) {
    const r = repository(t); r.write(name, 'application change\n'); r.write('docs/guide.md'); r.commit();
    assert.equal(r.run().status, 1, name);
  }
});

test('the full successful-baseline diff retains application changes from an intervening failed commit', t => {
  const r = repository(t); r.write('app/page.tsx', 'Unpublished application change\n'); r.commit();
  r.write('README.md', 'Latest commit only changes README\n'); r.commit();
  assert.equal(r.run().status, 1);
});

test('missing or unavailable history, malformed SHAs and a first branch preview build without fetching', t => {
  const r = repository(t); r.write('docs/guide.md'); r.commit();
  for (const value of ['', '0'.repeat(40), 'f'.repeat(40), 'HEAD^', '--help']) assert.equal(r.run({ VERCEL_GIT_PREVIOUS_SHA: value }).status, 1);
  assert.equal(r.run({ VERCEL_GIT_COMMIT_SHA: '--help' }).status, 1);
  writeFileSync(path.join(r.cwd, '.git/shallow'), r.git('rev-parse', 'HEAD') + '\n');
  assert.equal(r.run().status, 1);
});

test('redeploys of the same commit, empty diffs and mismatched checkouts all build', t => {
  const r = repository(t);
  assert.equal(r.run().status, 1);
  r.git('commit', '--allow-empty', '-qm', 'empty deployment');
  assert.equal(r.run().status, 1);
  assert.equal(r.run({ VERCEL_GIT_COMMIT_SHA: r.previous }).status, 1);
});

test('unrelated histories after force-pushing build instead of comparing the wrong parent', t => {
  const r = repository(t); r.git('checkout', '--orphan', 'rewritten'); r.write('docs/rewritten.md'); r.commit();
  assert.equal(r.run().status, 1);
});

test('a missing provider, project, branch or verified Vercel context cannot skip a build', t => {
  const r = repository(t); r.write('docs/guide.md'); r.commit();
  for (const [key, value] of Object.entries({ VERCEL: '', VERCEL_PROJECT_ID: 'another-project', VERCEL_GIT_REPO_ID: 'another-repo', VERCEL_GIT_PROVIDER: 'gitlab', VERCEL_GIT_COMMIT_REF: '' })) assert.equal(r.run({ [key]: value }).status, 1, key);
  assert.equal(r.run({ VERCEL_GIT_COMMIT_REF: 'main' }).status, 1);
});

test('renaming between documentation and application paths cannot hide a runtime change', t => {
  const r = repository(t); r.git('mv', 'app/page.tsx', 'docs/moved.md'); r.commit();
  assert.equal(r.run().status, 1);
});

test('NUL-delimited names cannot disguise an application path as a documentation change', t => {
  const r = repository(t); r.write('docs/line\nbreak.md'); r.commit();
  assert.equal(r.run().status, 0);
  r.write('app/page\nREADME.md', 'runtime\n'); r.commit();
  assert.equal(r.run().status, 1);
});
