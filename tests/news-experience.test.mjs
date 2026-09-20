import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const newsLibrary = read('lib/news.ts');
const newsPage = read('app/news/page.tsx');
const storyPage = read('app/news/[id]/page.tsx');
const newsApi = read('app/api/news/route.ts');
const ticker = read('components/updates-ticker.tsx');
const sitemap = read('app/sitemap.ts');
const nextConfig = read('next.config.ts');

test('the external-news experience exposes all public entry points', () => {
  for (const path of [
    'app/news/page.tsx',
    'app/news/news.module.css',
    'app/news/[id]/page.tsx',
    'app/news/[id]/story.module.css',
    'app/api/news/route.ts',
    'components/news-image.tsx',
  ]) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);

  assert.ok(sitemap.includes("{ path: '/news'"));
  assert.ok(ticker.includes("fetch('/api/news'"));
  assert.ok(ticker.includes('href="/news"'));
});

test('news sources are fetched concurrently and cached at the server boundary', () => {
  assert.ok(newsLibrary.includes('Promise.allSettled(NEWS_FEEDS.map(fetchFeed))'));
  assert.ok(newsLibrary.includes('next: { revalidate }'));
  assert.ok(newsLibrary.includes('FEED_REVALIDATE_SECONDS = 15 * 60'));
  assert.ok(newsApi.includes("'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800'"));
});

test('external article and image URLs are constrained to known secure publishers', () => {
  assert.ok(newsLibrary.includes("if (parsed.protocol !== 'https:' || !publisherForHostname(parsed.hostname)) return null"));
  assert.ok(newsLibrary.includes('TRUSTED_IMAGE_HOSTS.has(hostname)'));
  assert.ok(newsLibrary.includes("'qena.gov.eg'"));
  assert.ok(newsLibrary.includes("extractTag(block, 'News:Image')"));
  assert.ok(newsLibrary.includes("q=%D9%82%D9%86%D8%A7&format=rss"));
  assert.ok(nextConfig.includes("hostname: 'www.bing.com'"));
  assert.ok(nextConfig.includes("hostname: 'img.youm7.com'"));
  assert.ok(nextConfig.includes("hostname: 'media.elwatannews.com'"));
  assert.ok(nextConfig.includes("hostname: 'mediaaws.almasryalyoum.com'"));
});

test('news previews preserve attribution and send readers to the original publisher', () => {
  assert.ok(newsPage.includes('الصورة: {item.source}'));
  assert.ok(newsPage.includes('لا ننسخ النص الكامل'));
  assert.ok(newsPage.includes('اقرأ من المصدر'));
  assert.ok(storyPage.includes('فتح الخبر الأصلي'));
  assert.ok(storyPage.includes('الحقوق لـ {item.source}'));
  assert.ok(storyPage.includes('isBasedOn: item.url'));
});

test('temporary story previews defer indexing authority to the original article', () => {
  assert.ok(storyPage.includes('alternates: { canonical: item.url }'));
  assert.ok(storyPage.includes('index: false'));
  assert.ok(storyPage.includes("'@type': 'WebPage'"));
  assert.ok(!storyPage.includes("'@type': 'NewsArticle'"));
});
