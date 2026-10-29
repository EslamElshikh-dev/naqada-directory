import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { isolatedPage } from './qa-browser-page.mjs';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const folder = 'artifacts/home-hero';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [390, 1440]) {
    for (const format of ['avif', 'webp', 'jpeg']) {
      const page = await isolatedPage(browser, { viewport: { width, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setDisabledImageTypes', { imageTypes: format === 'avif' ? [] : format === 'webp' ? ['avif'] : ['avif', 'webp'] });
      // Mirror a JPEG-only browser's Accept header for the existing optimizer fallback.
      if (format === 'jpeg') await page.route('**/_next/image/**', route => route.continue({ headers: { ...route.request().headers(), accept: 'image/jpeg' } }));
      const requests = [], responses = [];
      page.on('request', request => { if (request.url().includes('naqada-home')) requests.push(request.url()); });
      page.on('response', response => { if (response.url().includes('naqada-home')) responses.push(response); });
      const document = await page.goto(base, { waitUntil: 'domcontentloaded' });
      const markup = await document.text();
      const head = markup.slice(0, markup.indexOf('</head>'));
      const initialHints = [...head.matchAll(/<link\b[^>]*type="image\/avif"[^>]*>/g)];
      assert.equal(initialHints.length, 2, 'Both responsive hero preloads must arrive in the initial head');
      for (const [hint] of initialHints) assert.match(hint, /href="\/images\/home-hero\/[^"]+\.avif"/);
      await page.evaluate(() => document.fonts.ready);
      const photo = page.locator('img[alt="مشهد تعبيري من البيئة الريفية في مركز نقادة بمحافظة قنا"]');
      await photo.evaluate(node => node.decode());
      const currentSrc = await photo.evaluate(node => node.currentSrc);
      const selected = responses.filter(response => response.url() === currentSrc);
      assert.equal(selected.length, 1, 'The selected hero must be downloaded exactly once');
      // CDP disables picture selection/decoding for a format, but does not
      // change the real engine's MIME eligibility for typed preload hints.
      // Enforce one total request with the actual supported AVIF engine;
      // fallback cases check the selected resource separately from those hints.
      if (format === 'avif') assert.equal(requests.length, 1);
      assert.equal(selected[0].status(), 200);
      assert.match(selected[0].headers()['content-type'], new RegExp('image/' + format));
      assert.ok(currentSrc.includes(format === 'jpeg' ? '/_next/image/' : '/images/home-hero/'));
      if (format !== 'jpeg') assert.match(selected[0].headers()['cache-control'], /max-age=31536000.*immutable/);
      const bytes = (await selected[0].body()).length;
      assert.ok(bytes < (format === 'jpeg' ? 250000 : 110000), 'Fallback must not download the 1 MB original');
      assert.equal(await photo.getAttribute('loading'), 'eager');
      assert.equal(await photo.getAttribute('fetchpriority'), 'high');
      assert.equal(await photo.evaluate(node => getComputedStyle(node).objectPosition), '50% 53%');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `${folder}/${format}-${width}.png` });
      results.push({ width, format, currentSrc, bytes, selectedPhotoRequests: selected.length, totalRequests: requests.length, preloadsInInitialHead: initialHints.length });
      await page.close();
    }
  }
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  await writeFile(folder + '/results.json', JSON.stringify(results, null, 2));
}
