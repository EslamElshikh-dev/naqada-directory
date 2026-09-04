import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const layout = read('app/layout.tsx');
const sitemap = read('app/sitemap.ts');
const robots = read('app/robots.ts');
const site = read('lib/site.ts');
const contribute = read('app/contribute/page.tsx');
const privacy = read('app/privacy/page.tsx');

const officialOrigin = 'https://naqada-directory.vercel.app';
const verificationToken = 'a5AfDDI67VsUYxqSvx00gPy5bqSb1V9YoZ1DX8-GkxY';

test('official Vercel origin and Search Console verification stay pinned', () => {
  assert.ok(site.includes(`url: '${officialOrigin}'`));
  assert.ok(layout.includes(verificationToken));
  assert.ok(layout.includes('<html lang="ar-EG"'));
});

test('indexable pages expose unrestricted Google preview directives', () => {
  assert.ok(layout.includes("'max-image-preview': 'large'"));
  assert.ok(layout.includes("'max-snippet': -1"));
  assert.ok(layout.includes("'max-video-preview': -1"));
});

test('robots.txt stays crawlable and points at the canonical sitemap', () => {
  assert.ok(robots.includes("allow: '/'"));
  assert.ok(robots.includes('sitemap: `${siteConfig.url}/sitemap.xml`'));
});

test('utility workflows are noindex-follow and excluded from the sitemap', () => {
  for (const source of [contribute, privacy]) {
    assert.ok(source.includes('index: false'));
    assert.ok(source.includes('follow: true'));
  }
  assert.ok(!sitemap.includes("{ path: '/contribute'"));
  assert.ok(!sitemap.includes("{ path: '/privacy'"));
});

test('sitemap remains focused on canonical content collections and listings', () => {
  assert.ok(sitemap.includes('...categories.map'));
  assert.ok(sitemap.includes('...indexableLocalities.map'));
  assert.ok(sitemap.includes('item.count >= 3'));
  assert.ok(sitemap.includes('...businesses.map'));
});

test('deprecated sitelinks SearchAction markup is not emitted', () => {
  assert.ok(!layout.includes("'@type': 'SearchAction'"));
});
