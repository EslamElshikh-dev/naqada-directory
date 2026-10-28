import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const nodeRequire = createRequire(import.meta.url);
const modules = new Map();
function loadModule(name, parent = root) {
  const target = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(parent, name);
  const path = [target, `${target}.ts`, `${target}.json`].find(existsSync);
  if (!path) throw Error(`Missing test dependency: ${name}`);
  if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'));
  if (modules.has(path)) return modules.get(path).exports;
  const record = { exports: {} };
  modules.set(path, record);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, { module: record, exports: record.exports, URL, URLSearchParams,
    require: (dependency) => dependency.startsWith('.') || dependency.startsWith('@/')
      ? loadModule(dependency, dirname(path)) : nodeRequire(dependency),
  }, { filename: path });
  return record.exports;
}

const { RequestLimiter } = loadModule('./lib/request-limiter');
test('request limits isolate visitors, expire counters and bound memory', () => {
  const limiter = new RequestLimiter(2, 1000, 3);
  const headers = ip => ({ get: key => key === 'x-forwarded-for' ? ip : null });
  assert.ok(limiter.take(headers('192.0.2.1'), 0).allowed);
  assert.ok(limiter.take(headers('192.0.2.1'), 1).allowed);
  assert.equal(limiter.take(headers('192.0.2.1'), 2).allowed, false);
  assert.equal(limiter.take(headers('192.0.2.1'), 2).retryAfter, 1);
  assert.ok(limiter.take(headers('192.0.2.2'), 2).allowed);
  assert.ok(limiter.take(headers('192.0.2.1'), 1000).allowed);
  for (let i=0;i<100;i++) limiter.take(headers('198.51.100.' + i), 1001);
  assert.ok(limiter.size <= 3);
  assert.ok(limiter.take(headers('192.0.2.1'), 2001).allowed);
});
