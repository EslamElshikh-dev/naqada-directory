import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { isolatedPage } from './qa-browser-page.mjs';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const paths = ['/villages/بشلاو/?page=2', '/directory/التعليم/?page=2', '/villages/مدينه-نقاده/الطب-والصحه/?page=2'];
const normalize = value => value.replace(/\s+/g, ' ').trim();
const decode = value => normalize(value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'"));
const report = [];
const browser = await chromium.launch({ headless: true });
await fs.mkdir('artifacts', { recursive: true });

async function serverCards(path) {
  const response = await fetch(base + encodeURI(path));
  assert.equal(response.status, 200, path);
  const body = await response.text();
  const grid = body.slice(body.indexOf('class="listing-grid"'));
  const end = grid.indexOf('<nav class="pagination"');
  return Array.from((end < 0 ? grid : grid.slice(0, end)).matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g), match => decode(match[1]));
}
async function renderedCards(page) {
  await page.locator('.listing-grid h3').first().waitFor();
  return (await page.locator('.listing-grid h3').allTextContents()).map(normalize);
}

try {
  for (const [viewport, width, height] of [['mobile', 390, 844], ['desktop', 1440, 1000]]) {
    const page = await isolatedPage(browser, { viewport: { width, height } });
    await page.route('**/api/analytics/visit*', route => route.fulfill({ json: { ok: true } }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const path of paths) {
      const expected = await serverCards(path);
      await page.goto(base + encodeURI(path), { waitUntil: 'networkidle' });
      assert.deepEqual(await renderedCards(page), expected, `${viewport}: hydration changed ${path}`);
      assert.ok((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('?page=2'));
      assert.ok((await page.locator('.pagination').textContent()).includes('2'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      report.push({ viewport, path, cards: expected, serverMatchesBrowser: true });
    }
    await page.goto(base + encodeURI(paths[0]), { waitUntil: 'networkidle' });
    const second = await renderedCards(page);
    await page.getByRole('link', { name: 'التالي', exact: true }).click();
    await page.waitForURL(url => url.searchParams.get('page') === '3');
    assert.deepEqual(await renderedCards(page), await serverCards('/villages/بشلاو/?page=3'));
    await page.goBack({ waitUntil: 'networkidle' });
    await page.waitForURL(url => url.searchParams.get('page') === '2');
    // History navigation changes the URL before React finishes restoring the cached tree.
    // Wait for the visible result set, rather than reading the still-mounted page 3.
    await page.waitForFunction(expected => JSON.stringify(Array.from(document.querySelectorAll('.listing-grid h3'), element => element.textContent.replace(/\s+/g, ' ').trim())) === JSON.stringify(expected), second, { timeout: 8000 });
    assert.deepEqual(await renderedCards(page), second, `${viewport}: back navigation lost page 2`);
    assert.ok((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('?page=2'));
    await page.locator('.listing-grid').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/indexing-pagination-${viewport}.png` });
    await page.getByLabel('الترتيب', { exact: true }).selectOption('name');
    await page.waitForURL(url => url.searchParams.get('sort') === 'name');
    const sortedPath = new URL(page.url()).pathname + new URL(page.url()).search;
    await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual(await renderedCards(page), await serverCards(decodeURI(sortedPath)));
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    assert.equal(errors.length, 0, `${viewport}: ${errors.join('; ')}`);
    report.push({ viewport, nextAndBack: true, sortReloadMatchesServer: true, errors });
    await page.close();
  }
  await fs.writeFile('artifacts/directory-pagination-browser.json', JSON.stringify(report, null, 2));
  console.log(`Passed ${report.length} browser scenarios across mobile and desktop.`);
} finally {
  await browser.close();
}
