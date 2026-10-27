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

const site = loadModule('./lib/site');
const paths = loadModule('./lib/activity-path');
const schema = loadModule('./lib/business-schema');

test('metadata stays bounded, branded and absolute without inventing contact details', () => {
  for (const value of ['صيدلية النيل', 'عنوان طويل '.repeat(30), 'دليل نقادة | دليل الخدمات والأنشطة']) {
    const title = site.pageTitle(value);
    assert.ok(title.length <= 60);
    assert.ok(title.endsWith(' | دليل نقادة'));
    const description = site.pageDescription(value);
    assert.ok(description.length >= 120 && description.length <= 155);
  }
  const meta = site.buildPageMetadata({ title: 'صيدلية النيل', description: 'معلومات منشورة عن الصيدلية', path: '/listing/example/' });
  assert.equal(meta.openGraph.url, site.siteConfig.url + '/listing/example/');
  assert.equal(meta.title.absolute, meta.openGraph.title);
  assert.equal(meta.description, meta.twitter.description);
  const card = site.buildPageMetadata({ title: 'عنوان', description: 'معلومات منشورة', path: '/listing/example/', socialImage: { url: 'https://naqada-directory.vercel.app/listing/example/opengraph-image/', width: 1200, height: 630, type: 'image/jpeg' } });
  assert.equal(card.openGraph.images[0].width, 1200);
  assert.equal(card.openGraph.images[0].height, 630);
  assert.equal(card.openGraph.images[0].url, card.twitter.images[0]);
});

test('owner activity paths preserve the stable id through names and legacy links', () => {
  const id = '7828410d-1d6b-4ab9-8394-6a266d0bcf2e';
  const href = paths.ownerActivityHref({ id, name: 'صيدلية النيل' });
  assert.equal(paths.ownerActivityId(decodeURIComponent(href.split('/')[2])), id);
  assert.equal(paths.ownerActivityNeedsRedirect(href.split('/')[2], href), false);
  assert.equal(paths.ownerActivityNeedsRedirect(decodeURIComponent(href.split('/')[2]), href), false);
  assert.equal(paths.ownerActivityNeedsRedirect(id, href), true);
  assert.equal(paths.ownerActivityNeedsRedirect('wrong-name-' + id, href), true);
  assert.equal(paths.ownerActivityId(id), id);
  assert.equal(paths.ownerActivityId('arbitrary'), null);
  assert.equal(paths.ownerActivityId('../' + id), null);
  assert.throws(() => paths.ownerActivityHref({ id: 'bad' }));
});

test('business schema omits unstructured hours and map viewports', () => {
  assert.equal(schema.fullTimeHours('اتصل لتأكيد المواعيد'), undefined);
  assert.equal(schema.fullTimeHours('ليس 24 ساعة'), undefined);
  assert.equal(schema.fullTimeHours('24 ساعة عدا الجمعة'), undefined);
  assert.equal(schema.fullTimeHours('24 ساعة')[0].opens, '00:00');
  assert.equal(schema.verifiedMapCoordinates('https://www.google.com/maps/@25.9,32.7,15z'), undefined);
  assert.equal(schema.verifiedMapCoordinates('https://example.com/maps?q=25,32'), undefined);
  assert.equal(schema.verifiedMapCoordinates('https://maps.google.com/?q=95,32'), undefined);
  const pin = schema.verifiedMapCoordinates('https://www.google.com/maps/search/?api=1&query=25.9,32.7');
  assert.equal(pin.latitude, 25.9);assert.equal(pin.longitude, 32.7);
});
