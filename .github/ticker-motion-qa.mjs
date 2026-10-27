import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { isolatedPage } from './qa-browser-page.mjs';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const results = [];
const baseURL = process.env.TICKER_QA_BASE_URL || 'http://127.0.0.1:3000/';
const readMotion = page => page.evaluate(() => {
  const root = document.querySelector('section[aria-label="آخر أخبار وتحديثات دليل نقادة"]');
  const track = root.querySelector('[class*="_track"]');
  const style = getComputedStyle(track);
  return {
    time: performance.now(),
    x: new DOMMatrixReadOnly(style.transform).m41,
    ready: track.dataset.ready === 'true',
    animation: style.animationName,
    paused: style.animationPlayState,
    fonts: document.fonts.status,
    textSize: Number.parseFloat(getComputedStyle(root.querySelector('a strong')).fontSize),
    headlineSize: Number.parseFloat(getComputedStyle(track.querySelector('a strong')).fontSize),
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  };
});

try {
  await fs.mkdir('artifacts/ticker', { recursive: true });
  for (const [name, width, count, failFeeds] of [
    ['mobile-390-short', 390, 1, false],
    ['mobile-430-long', 430, 6, false],
    ['desktop-1440-long', 1440, 6, false],
    ['mobile-390-fallback', 390, 0, true],
  ]) {
    const page = await isolatedPage(browser, { viewport: { width, height: 900 } });
    await page.route('**/api/{jobs,news}*', async route => {
      await new Promise(resolve => setTimeout(resolve, 900));
      await route.fulfill(failFeeds ? { status: 503, json: {} } : {
        json: { items: Array.from({ length: count }, (_, i) => ({
          href: '/news/', tag: 'خبر موثّق',
          text: `${new URL(route.request().url()).pathname} ${i + 1} — متابعة أخبار نقادة وقنا والخدمات المحلية من مصادرها الموثوقة ${'بتفاصيل واضحة للقراءة '.repeat(count)}`,
        })) },
      });
    });
    await page.route('**/*.woff2*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1800));
      await route.continue();
    });

    for (const refresh of [false, true]) {
      if (refresh) await page.reload({ waitUntil: 'domcontentloaded' });
      else await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      assert.equal((await readMotion(page)).animation, 'none', `${name}: waits for the initial feed`);
      await page.waitForFunction(() => document.querySelector('[class*="_track"]')?.dataset.ready === 'true');
      const ready = await readMotion(page);
      assert.equal(ready.fonts, 'loaded', `${name}: waits for the Arabic font`);
      assert.ok(ready.headlineSize >= 14, `${name}: readable ticker headlines (${ready.headlineSize}px)`);
      assert.ok(ready.textSize >= 12, `${name}: readable ticker heading (${ready.textSize}px)`);
      await page.waitForTimeout(1200);
      const samples = [];
      for (let i = 0; i < 4; i++) {
        samples.push(await readMotion(page));
        if (i < 3) await page.waitForTimeout(500);
      }
      const speeds = samples.slice(1).map((sample, i) => (sample.x - samples[i].x) / (sample.time - samples[i].time) * 1000);
      for (const speed of speeds) assert.ok(speed > 20 && speed < 28, `${name}: left-to-right reading speed ${speed.toFixed(1)}px/s`);
      assert.ok(samples.every(sample => !sample.overflow), `${name}: no page overflow`);
      results.push({ name, refresh, speeds });
    }

    const dismissInstall = page.getByRole('button', { name: 'إغلاق تنبيه تثبيت التطبيق', exact: true });
    if (await dismissInstall.isVisible()) await dismissInstall.click();
    await page.getByRole('button', { name: 'إيقاف حركة شريط الأخبار', exact: true }).click();
    const beforePause = await readMotion(page);
    await page.waitForTimeout(500);
    assert.ok(Math.abs((await readMotion(page)).x - beforePause.x) < 1, `${name}: pause holds position`);
    await page.getByRole('button', { name: 'استئناف حركة شريط الأخبار', exact: true }).click();
    const beforeResume = await readMotion(page);
    await page.waitForTimeout(500);
    assert.ok((await readMotion(page)).x > beforeResume.x + 8, `${name}: resumes toward the right`);
    await page.screenshot({ path: `artifacts/ticker/${name}.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal((await readMotion(page)).animation, 'none', `${name}: respects reduced motion`);
    console.log(`${name}: startup, refresh, reading speed, pause and reduced motion passed`);
    await page.close();
  }
  await fs.writeFile('artifacts/ticker/results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
} finally {
  await browser.close();
}
