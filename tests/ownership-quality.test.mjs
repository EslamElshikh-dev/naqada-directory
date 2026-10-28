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

const { safeAuthReturn } = loadModule('./lib/auth/return-path');
const { cleanPhone } = loadModule('./lib/site');
const { duplicateBusiness } = loadModule('./lib/duplicate-business');
test('OAuth return paths only accept a single claim slug', () => {
  for (const value of ['https://example.com', '//example.com', '/admin/', '/claim/../admin', '/claim/a?next=x', '/claim/a#b', '/claim/a%2fb', '/claim/%252fadmin', '/claim/']) assert.equal(safeAuthReturn(value), '/account/');
  assert.equal(safeAuthReturn('/claim/nile-pharmacy/'), '/claim/nile-pharmacy/');
  assert.equal(safeAuthReturn('/claim/صيدلية-النيل/'), '/claim/' + encodeURIComponent('صيدلية-النيل') + '/');
});
test('duplicate detection matches normalized Egyptian phones, names and locality without merging', () => {
  const item = { id: 'owner:one', name: 'صيدلية الأمل', phone: '٠١٠١٢٣٤٥٦٧٨', locality: 'الخطارة' };
  const candidate = { name: 'صيدلية الامل', phone: '+201012345678', locality: 'الخطارة' };
  assert.equal(cleanPhone('٠١٠١٢٣٤٥٦٧٨'), '+201012345678');
  assert.equal(cleanPhone('00201012345678'), '+201012345678');
  assert.equal(cleanPhone('123'), '123');
  assert.equal(cleanPhone('+966501234567'), '+966501234567');
  assert.equal(duplicateBusiness([item], candidate)?.id, item.id);
  assert.equal(duplicateBusiness([item], candidate, 'one'), undefined);
  assert.equal(duplicateBusiness([item], { ...candidate, locality: 'دنفيق' }), undefined);
  assert.equal(duplicateBusiness([item], { ...candidate, name: 'صيدلية جديدة' }), undefined);
});
