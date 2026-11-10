import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const origin = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const publicOrigin = 'https://naqada-directory.vercel.app';
const decode = value => value.replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim();
const snapshots = [];

async function inspect(path) {
  const response = await fetch(origin + encodeURI(path), { headers: { 'User-Agent': 'Googlebot' } });
  assert.equal(response.status, 200, path);
  const body = await response.text();
  const canonical = body.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1];
  assert.ok(canonical, `missing canonical: ${path}`);
  const grid = body.slice(body.indexOf('class="listing-grid"'));
  const stop = grid.indexOf('<nav class="pagination"');
  const cards = Array.from((stop < 0 ? grid : grid.slice(0, stop)).matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g), match => decode(match[1]));
  const graph = Array.from(body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g), match => JSON.parse(match[1])).flatMap(item => item['@graph'] || [item]);
  const list = graph.find(item => item['@type'] === 'ItemList') || graph.find(item => item.mainEntity?.['@type'] === 'ItemList')?.mainEntity;
  const result = { path, canonical: decodeURIComponent(decode(canonical)), cards, list, noindex: /name="robots"[^>]+content="[^"]*noindex/.test(body), body };
  snapshots.push({ path, canonical: result.canonical, cards, noindex: result.noindex });
  return result;
}

for (const path of ['/villages/بشلاو/', '/directory/التعليم/', '/villages/مدينه-نقاده/الطب-والصحه/']) {
  const first = await inspect(path);
  const second = await inspect(path + '?page=2');
  assert.equal(first.canonical, publicOrigin + path);
  assert.equal(second.canonical, publicOrigin + path + '?page=2');
  assert.ok(first.cards.length > 0 && second.cards.length > 0, path);
  assert.ok(second.cards.every(name => !first.cards.includes(name)), `repeated first-page cards: ${path}`);
  assert.equal(first.noindex, false);
  assert.equal(second.noindex, false);
  assert.deepEqual(Array.from(second.list.itemListElement, item => item.name), second.cards, `schema/cards mismatch: ${path}`);
  assert.equal(second.list.itemListElement[0].position, 13);
  assert.ok(second.list.itemListElement.every(item => new URL(item.url).pathname.endsWith('/')));
  assert.ok(second.body.includes(`?page=3`) || second.cards.length < 12, `missing next link: ${path}`);
}
for (const [path, expected] of [
  ['/directory/التعليم/?category=الطب والصحة&page=2', '/directory/التعليم/?page=2'],
  ['/villages/مدينه-نقاده/الطب-والصحه/?category=التعليم&locality=طوخ&page=2', '/villages/مدينه-نقاده/الطب-والصحه/?page=2'],
]) {
  const locked = await inspect(path);
  assert.equal(locked.canonical, publicOrigin + expected);
  assert.equal(locked.noindex, false);
}
const third = await inspect('/villages/بشلاو/?page=3');
assert.ok(third.cards.every(name => !snapshots[0].cards.includes(name) && !snapshots[1].cards.includes(name)));
for (const page of ['0', '2junk', '99999999999999999999999']) {
  const invalid = await inspect('/villages/بشلاو/?page=' + page);
  assert.equal(invalid.canonical, publicOrigin + '/villages/بشلاو/');
  assert.deepEqual(invalid.cards, snapshots[0].cards);
}
const overflow = await inspect('/villages/بشلاو/?page=999');
assert.equal(overflow.canonical, third.canonical);
assert.deepEqual(overflow.cards, third.cards);
for (const path of ['/villages/بشلاو/?sort=name', '/directory/التعليم/?q=مدرسة', '/villages/مدينه-نقاده/الطب-والصحه/?sort=rating']) {
  const filtered = await inspect(path);
  assert.equal(filtered.noindex, true, path);
  assert.equal(filtered.canonical, publicOrigin + path.split('?')[0]);
}
const control = await inspect('/directory/?page=2');
assert.equal(control.canonical, publicOrigin + '/directory/?page=2');
const grocery = await inspect('/activities/سوبر-ماركت-وبقالات/');
assert.equal(grocery.cards.filter(name => name === 'محلات الفتح إدارة عمار عبد الشافي').length, 1);
const groceryList = grocery.list.itemListElement.filter(item => item.name === 'محلات الفتح إدارة عمار عبد الشافي');
assert.equal(groceryList.length, 1);
assert.ok(groceryList[0].url.endsWith('/'));
const prerender = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));
for (const path of ['/villages/بشلاو', '/directory/التعليم']) {
  const route = Object.entries(prerender.routes).find(([key]) => decodeURIComponent(key).replace(/\/$/, '') === path)?.[1];
  assert.equal(route?.initialRevalidateSeconds, 3600, `cached base route lost ISR: ${path}`);
}
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/directory-pagination.json', JSON.stringify(snapshots, null, 2));
console.log(`Passed ${snapshots.length} HTTP cases: pagination, filters, schema, groceries and cached base pages.`);
