import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'https://naqada-directory.vercel.app';
const folder = 'artifacts/production-acceptance';
const report = { generatedAt: new Date().toISOString(), base, routes: [], interactions: [], counts: {}, news: [], failures: [] };
const strictCounts = process.env.QA_STRICT_COUNTS !== '0';
const browser = await chromium.launch({ headless: true });
await fs.mkdir(folder, { recursive: true });

async function guardedPage(width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  page.setDefaultTimeout(20000);
  await page.route('**/*', async route => {
    const request = route.request();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      return route.fulfill({ json: { ok: true, summary: { average: 0, count: 0, distribution: {} } } });
    }
    return route.continue();
  });
  await page.addInitScript(() => {
    window.qaTiming = { lcp: 0, cls: 0 };
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.qaTiming.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.qaTiming.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  return page;
}
async function settled(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
}
async function attempt(name, fn) {
  try { await fn(); } catch (error) { report.failures.push(`${name}: ${error.message}`); }
  await fs.writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2));
}
const number = text => Number(text.replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)).replace(/[^0-9]/g, ''));

try {
  const sitemapResponse = await fetch(`${base}/sitemap.xml`);
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  const owner = sitemap.match(/<loc>[^<]*(\/activity\/[0-9a-f-]{36}\/)\s*<\/loc>/i)?.[1];
  const routes = [['home', '/'], ['directory', '/directory/'], ['coverage', '/coverage/'], ['about', '/about/'], ['villages', '/villages/'], ['bashlaw', '/villages/بشلاو/'], ['dnfiq', '/villages/دنفيق/'], ['services', '/activities/'], ['pharmacies', '/activities/صيدليات/'], ['listing', '/listing/صيدليه-مومن-مدينه-نقاده/'], ['news', '/news/'], ['archive', '/news/archive/']];
  if (owner) routes.push(['owner', owner]);
  const internalLinks = new Set();
  for (const width of [320, 390, 430, 768, 1024, 1440]) {
    const selected = [390, 1440].includes(width) ? routes : routes.filter(([name]) => ['home', 'directory', 'villages', 'listing', 'news'].includes(name));
    for (const [name, path] of selected) await attempt(`${width} ${name}`, async () => {
      const page = await guardedPage(width);
      const errors = [], networkErrors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) networkErrors.push({ url: response.url(), status: response.status() }); });
      try {
        const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
        await settled(page);
        const initial = await page.evaluate(() => ({ ...window.qaTiming, ttfb: performance.getEntriesByType('navigation')[0].responseStart, dom: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd }));
        if (name === 'home') {
          const input = page.locator('#home-search');
          await input.click({ trial: true });
          const box = await input.boundingBox();
          assert.ok(box && box.y >= 0 && box.y + box.height < 830, 'First-visit search is outside the usable first screen');
          assert.equal(await page.getByRole('button', { name: 'إغلاق رسالة الترحيب' }).count(), 0);
          assert.equal(await page.locator('aside[aria-label="تثبيت تطبيق دليل نقادة"]').count(), 0);
          if (width === 390) report.counts.home = number(await page.locator('[aria-label="إحصاءات الدليل"] b').first().textContent());
        }
        await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .8) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 35)); } scrollTo(0, 0); });
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          h1: [...document.querySelectorAll('h1')].map(node => node.textContent),
          contacts: [...document.querySelectorAll('main a[href^="tel:"],main a[href*="wa.me/"]')].map(node => ({ name: node.getAttribute('aria-label') || node.textContent, href: node.getAttribute('href') })),
          links: [...new Set([...document.querySelectorAll('main a[href]')].map(node => node.getAttribute('href')).filter(href => href.startsWith('/') && !href.startsWith('//')))],
          brokenLocalImages: [...document.querySelectorAll('main img')].filter(node => node.currentSrc.startsWith(location.origin) && node.complete && !node.naturalWidth).map(node => node.currentSrc),
          schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)),
        }));
        const record = { width, name, path, status: response.status(), initial, errors, networkErrors, ...metrics };
        report.routes.push(record);
        for (const href of metrics.links) internalLinks.add(href.split('#')[0]);
        await page.screenshot({ path: `${folder}/${name}-${width}.png`, fullPage: true });
        assert.equal(response.status(), 200);
        assert.ok(metrics.scrollWidth <= width + 1, `Horizontal overflow: ${metrics.scrollWidth}`);
        assert.equal(metrics.h1.length, 1);
        assert.deepEqual(errors, [], 'Browser exception');
        assert.deepEqual(networkErrors, [], 'Failed first-party request');
        assert.deepEqual(metrics.brokenLocalImages, [], 'Local image failed');
        assert.ok(!JSON.stringify(metrics.schemas).includes('/listing/owner-'), 'Structured data links to the wrong owner route');
        if (width === 390 && ['directory', 'villages'].includes(name)) report.counts[name] = number(await page.locator('main dl div').filter({ has: page.getByText('نشاط منشور', { exact: true }) }).locator('dd').textContent());
        if (width === 390 && name === 'coverage') report.counts.coverage = number(await page.locator('main .hero-inline-stats b').first().textContent());
        if (width === 390 && name === 'about') report.counts.about = number(await page.locator('[aria-label="الدليل في أرقام"] article b').first().textContent());
        if (['bashlaw', 'dnfiq'].includes(name)) {
          const navigationCount = number(await page.locator('nav[aria-label^="استكشاف سريع داخل"] a small').first().textContent());
          const resultsCount = number(await page.locator('main .results-bar strong').textContent());
          assert.equal(navigationCount, resultsCount, 'Village navigation and published results disagree');
        }
        if (width === 390 && name === 'news') report.news = await page.evaluate(() => [...document.querySelectorAll('main article')].flatMap(node => {
          const time = node.querySelector('time'), link = node.querySelector('a[href^="/news/"]');
          return time?.dateTime && link ? [{ href: link.getAttribute('href'), publishedAt: time.dateTime }] : [];
        }).slice(0, 4));
        console.log(JSON.stringify({ width, name, status: response.status(), overflow: metrics.scrollWidth > width + 1, timing: initial, errors: errors.length }));
      } finally { await page.close(); }
    });
  }
  await attempt('published catalog counts', async () => {
    const values = Object.values(report.counts);
    assert.equal(values.length, 5);
    assert.ok(values[0] > 0);
    if (strictCounts) assert.ok(values.every(count => count === values[0]), `Counts differ: ${JSON.stringify(report.counts)}`);
  });
  for (const width of [320, 390, 1440]) await attempt(`${width} navigation and search`, async () => {
    const page = await guardedPage(width);
    try {
      await page.goto(base, { waitUntil: 'domcontentloaded' }); await settled(page);
      if (width < 981) {
        const menu = page.getByLabel('قائمة أقسام دليل نقادة', { exact: true });
        await menu.click();
        const panel = page.getByRole('navigation', { name: 'كل أقسام الدليل' });
        await panel.getByRole('link', { name: /القرى والنجوع/ }).click();
        await page.waitForURL('**/villages/');
        assert.equal(await page.locator('details[open]').count(), 0);
        await page.goBack(); await page.locator('#home-search').waitFor();
      }
      await page.locator('#home-search').fill('صيدلية مؤمن');
      await page.locator('#home-search').press('Enter');
      await page.waitForURL('**/search/**');
      const result = page.locator('main a[href*="/listing/صيدليه-مومن-"]');
      await result.first().click();
      await page.waitForURL('**/listing/**');
      const contacts = page.locator('main a[href^="tel:"],main a[href*="wa.me/"]');
      assert.ok(await contacts.count() >= 2, 'Published phone/WhatsApp actions missing');
      for (const contact of await contacts.all()) await contact.click({ trial: true });
      await page.screenshot({ path: `${folder}/contact-journey-${width}.png` });
      report.interactions.push({ width, menu: width < 981 ? 'passed' : 'desktop navigation', search: 'passed', contactActions: await contacts.count() });
    } finally { await page.close(); }
  });
  for (const item of report.news) await attempt(`news date ${item.href}`, async () => {
    const page = await guardedPage(390);
    try {
      const response = await page.goto(`${base}${item.href}`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      const published = await page.locator('main time').first().getAttribute('datetime');
      assert.equal(published, item.publishedAt);
      item.detailDate = published;
      item.status = response.status();
      await page.screenshot({ path: `${folder}/news-${item.href.split('/').filter(Boolean).at(-1)}.png`, fullPage: true });
    } finally { await page.close(); }
  });
  const queue = [...internalLinks].filter(Boolean).slice(0, 180);
  report.links = [];
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const href = queue.shift();
      try {
        const response = await fetch(`${base}${href}`, { signal: AbortSignal.timeout(20000) });
        await response.arrayBuffer();
        report.links.push({ href, status: response.status });
        if (response.status >= 400) report.failures.push(`Internal link ${href}: HTTP ${response.status}`);
      } catch (error) { report.failures.push(`Internal link ${href}: ${error.message}`); }
    }
  }));
} finally {
  await fs.writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ routes: report.routes.length, interactions: report.interactions, counts: report.counts, news: report.news, links: report.links?.length, failures: report.failures }, null, 2));
if (report.failures.length) process.exitCode = 1;
