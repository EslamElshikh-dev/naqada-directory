import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { isolatedPage } from './qa-browser-page.mjs';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const folder = 'artifacts/reading-quality';
await mkdir(folder, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 430, 1440]) {
    const page = await isolatedPage(browser, { viewport: { width, height: 900 }, serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const launcher = page.getByRole('button', { name: 'افتح محادثة سند، مساعد دليل نقادة' });
    await launcher.click();
    const dialog = page.getByRole('dialog', { name: 'محادثة سند' });
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await dialog.evaluate(node => getComputedStyle(node).position), 'fixed');
    assert.equal(await dialog.getAttribute('aria-modal'), 'true');
    assert.ok(await page.locator('main').evaluate(node => Boolean(node.closest('[inert]'))));
    const controls = dialog.locator('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]');
    await controls.last().focus();
    await page.keyboard.press('Tab');
    assert.ok(await controls.first().evaluate(node => node === document.activeElement));
    await page.keyboard.press('Shift+Tab');
    assert.ok(await controls.last().evaluate(node => node === document.activeElement));
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.ok(await launcher.evaluate(node => node === document.activeElement));
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await page.locator('main[inert]').count(), 0);
    const notifications = page.getByRole('button', { name: /^عرض الإشعارات/ });
    await notifications.click();
    const notices = page.getByRole('dialog', { name: 'إشعاراتك' });
    await notices.waitFor({ state: 'visible' });
    assert.ok(await notices.evaluate(node => ['fixed', 'absolute'].includes(getComputedStyle(node).position)));
    await page.getByRole('button', { name: 'إغلاق الإشعارات', exact: true }).click();
    await page.screenshot({ path: `${folder}/home-${width}.png` });
    assert.deepEqual(errors, []);
    results.push({ width, keyboardTrapAndRestoredFocus: true, clientErrors: 0 });
    await page.close();
  }

  // A synthetic signed-in response exercises the automatic notice, without a
  // real account, session cookie or production write.
  const personalPage = await isolatedPage(browser, { viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  await personalPage.route('**/api/auth/session*', route => route.fulfill({ json: { user: {
    id: '00000000-0000-4000-8000-000000000001', displayName: 'مستخدم الفحص',
    email: 'quality@example.invalid', avatarUrl: '', emailVerified: true, createdAt: '2026-10-27T00:00:00Z',
  } } }));
  await personalPage.route('**/api/profile*', route => route.fulfill({ json: { profile: { fullName: 'مستخدم الفحص' } } }));
  await personalPage.route('**/api/notifications/personal/*', route => route.fulfill({ json: { items: [{
    id: 'quality-decision-fixture', kind: 'decision', status: 'published', tone: 'mint',
    href: '/updates/', label: 'قرار المراجعة', title: 'تم قبول الإضافة التجريبية', detail: 'إشعار اصطناعي لاختبار العرض فقط.',
    occurredAt: '2026-10-27T00:00:00Z',
  }] } }));
  await personalPage.goto(base, { waitUntil: 'networkidle' });
  const toast = personalPage.getByRole('status').filter({ hasText: 'تم قبول الإضافة التجريبية' });
  await toast.waitFor({ state: 'visible' });
  assert.equal(await toast.evaluate(node => getComputedStyle(node).position), 'fixed');
  await personalPage.getByRole('button', { name: 'إغلاق إشعار القبول', exact: true }).click();
  await toast.waitFor({ state: 'detached' });
  results.push({ automaticPersonalNoticeStyledAndDismissed: true, syntheticAccount: true });
  await personalPage.close();

  const page = await isolatedPage(browser, { viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  const directory = await fetch(base + '/directory/').then(response => response.text());
  const listing = directory.match(/href="(\/listing\/[^"?]+)"/)?.[1];
  assert.ok(listing, 'A published activity is required for the sharing journey');
  await page.goto(base + listing, { waitUntil: 'networkidle' });
  const directions = page.getByRole('link', { name: 'افتح الاتجاهات إلى النشاط على خرائط Google', exact: true }).first();
  if (await directions.count()) {
    const glyph = directions.locator('[aria-hidden="true"]').first();
    assert.equal(await glyph.evaluate(node => getComputedStyle(node).color), 'rgb(255, 255, 255)');
  }
  await page.evaluate(() => {
    navigator.share = async () => { throw new DOMException('Cancelled', 'AbortError'); };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async value => { window.qaCopiedCanonical = value; },
    } });
  });
  await page.getByRole('button', { name: 'مشاركة النشاط', exact: true }).click();
  assert.equal(await page.getByText('تعذّرت المشاركة. جرّب نسخ الرابط.', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'نسخ الرابط', exact: true }).click();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  assert.equal(await page.evaluate(() => window.qaCopiedCanonical), canonical);
  assert.ok((await page.locator('a[href^="https://wa.me/?text="]').getAttribute('href')).includes(encodeURIComponent(canonical)));
  results.push({ shareCancelledWithoutError: true, canonicalCopyAndWhatsApp: true });

  for (const [index, path] of [listing, '/villages/الخطاره/', '/blog/naqada-civilization-history/'].entries()) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const image = await page.locator('meta[property="og:image"]').getAttribute('content');
    assert.ok(image, `Missing Open Graph image: ${path}`);
    const imageUrl = new URL(image);
    const response = await fetch(base + imageUrl.pathname + imageUrl.search);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type')?.includes('image/jpeg'));
    const bytes = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    assert.ok(bytes.length <= 90_000, `${path}: oversized share image (${bytes.length} bytes)`);
    await writeFile(`${folder}/social-${index}.jpg`, bytes);
    results.push({ path, shareImage: { width: metadata.width, height: metadata.height, bytes: bytes.length } });
  }
  await page.close();

  const offlinePage = await isolatedPage(browser, { viewport: { width: 390, height: 900 }, serviceWorkers: 'allow' });
  await offlinePage.goto(base, { waitUntil: 'networkidle' });
  await offlinePage.evaluate(() => navigator.serviceWorker.ready);
  await offlinePage.waitForFunction(() => navigator.serviceWorker.controller);
  await offlinePage.goto(base + listing, { waitUntil: 'networkidle' });
  await offlinePage.waitForFunction(async () => {
    const cache = await caches.open('naqada-offline-v2');
    return Boolean(await cache.match(location.href));
  });
  await offlinePage.context().setOffline(true);
  await offlinePage.goto(base + listing, { waitUntil: 'domcontentloaded' });
  await offlinePage.getByRole('status').filter({ hasText: 'نسخة محفوظة' }).waitFor();
  assert.ok((await offlinePage.locator('h1').textContent()).trim());
  const cachedUrls = await offlinePage.evaluate(async () => (await (await caches.open('naqada-offline-v2')).keys()).map(request => request.url));
  assert.ok(cachedUrls.every(url => !/^\/(?:api|account|admin|moderator|claim)\//.test(new URL(url).pathname)));
  results.push({ offlinePublicSnapshot: true, privateRoutesExcluded: true });
  await offlinePage.close();
} finally {
  await browser.close();
  await writeFile(`${folder}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
