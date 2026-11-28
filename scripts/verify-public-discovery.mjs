import assert from 'node:assert/strict';

const base = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const origin = 'https://naqada-directory.vercel.app';
const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; NaqadaPublicDiscoveryCheck/1.0)' };
const mainDocument = html => html.match(/<main\b[^>]*\bid="main-content"[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
const links = html => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => decodeURIComponent(match[1].replaceAll('&amp;', '&')));
const ld = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));

async function document(path, noindex = false) {
  const response = await fetch(new URL(path, base), { headers, signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  assert.ok(canonical, `Missing canonical: ${path}`);
  const expected = new URL(path.split('?')[0], origin).href;
  assert.equal(decodeURIComponent(canonical), decodeURIComponent(expected), path);
  const robots = [...html.matchAll(/<meta\b[^>]*name="(?:robots|googlebot)"[^>]*content="([^"]+)"/g)].map(match => match[1]).join(',') + ',' + (response.headers.get('x-robots-tag') || '');
  assert.equal(/\bnoindex\b/i.test(robots), noindex, `${path}: ${robots}`);
  const main = mainDocument(html);
  assert.ok(main, `Missing initial main document: ${path}`);
  assert.equal((main.match(/<h1\b/g) || []).length, 1, path);
  return { html, main, links: links(main), schemas: ld(main) };
}

const home = await document('/');
const collection = home.schemas.find(item => item['@type'] === 'CollectionPage');
const featured = collection?.mainEntity?.itemListElement;
assert.ok(featured?.length >= 10, 'Homepage must describe the visible services and locality guides');
assert.equal(collection.mainEntity.numberOfItems, featured.length);
for (const item of featured) {
  const path = decodeURIComponent(new URL(item.url).pathname);
  assert.ok(home.links.some(href => decodeURIComponent(new URL(href, origin).pathname).replace(/\/$/, '') === path.replace(/\/$/, '')), `Discovery link missing from the initial main HTML: ${item.name}`);
}
for (const loading of ['جارٍ تجهيز الخدمات', 'جارٍ تجهيز خدمات القرى']) {
  assert.ok(!home.main.includes(loading), 'Core discovery cannot be a loading placeholder: ' + loading);
}

const resultPaths = [
  '/directory/',
  '/directory/دور-العباده/',
  '/villages/بشلاو/',
  '/villages/بشلاو/التجزيه-والتسوق/',
  '/activities/اطباء-وعيادات/',
];
for (const path of resultPaths) {
  const page = await document(path);
  const listings = page.links.filter(href => /^\/(listing|activity)\//.test(href));
  assert.ok(listings.length > 0, 'Published activity links missing from the initial main HTML: ' + path);
  assert.ok(!page.main.includes('جارٍ تجهيز النتائج') && !page.main.includes('جارٍ تجهيز الدليل'), path);
}

await document('/directory/?q=كاش', true);
await document('/knowledge/places/عزبة-إدريس/', true);

const priorityResponse = await fetch(base + '/priority/sitemap.xml', { signal: AbortSignal.timeout(30_000) });
assert.equal(priorityResponse.status, 200);
const priorityXml = await priorityResponse.text();
const priority = [...priorityXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(priority.length, 18, 'Keep the existing focused crawl set');
for (const url of priority) await document(new URL(url).pathname);

console.log(JSON.stringify({ checked: 'initial HTML, canonical, robots, visible discovery and current priority pages', homeDiscoveryLinks: featured.length, listingDocuments: resultPaths.length, priorityPages: priority.length, intentionalNoindexDocuments: 2 }));
