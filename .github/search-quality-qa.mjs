import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { isolatedPage as newIsolatedPage } from './qa-browser-page.mjs';

const baseURL = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const report = [];

async function isolatedPage(viewport) {
  const page = await newIsolatedPage(browser, { viewport });
  const events = [];
  // Verify payloads without creating fake production searches or page views.
  await page.route('**/functions/v1/directory-intake*', async (route) => {
    const body = route.request().postDataJSON();
    if (body?.action === 'event' && ['search', 'zero_results'].includes(body.eventType)) events.push(body);
    await route.fulfill({ headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }, json: { ok: true, summary: { average: 0, count: 0, distribution: {} } } });
  });
  await page.route('**/api/analytics/visit*', (route) => route.fulfill({ json: { ok: true } }));
  return { page, events };
}

try {
  for (const [name, width, height] of [['mobile', 390, 844], ['desktop', 1440, 1000]]) {
    const { page, events } = await isolatedPage({ width, height });
    await page.goto(`${baseURL}/directory/`, { waitUntil: 'networkidle' });
    const input = page.getByRole('searchbox', { name: 'ابحث داخل الدليل' });
    await input.fill('كشير بسو');
    await page.waitForTimeout(1_150); // Previously the 900 ms timer recorded fragments here.
    assert.equal(events.length, 0, `${name}: a typing pause must not count as a search`);
    const query = 'مركز تخاطب مقياساختبار';
    await input.fill(query);
    await page.waitForTimeout(1_150);
    assert.equal(events.length, 0, `${name}: live filtering must not create search events`);
    const submitted = page.waitForResponse((response) => response.url().includes('/directory-intake') && response.request().postDataJSON()?.eventType === 'zero_results');
    await page.locator('form.search-field button[type="submit"]').click();
    await submitted;
    assert.equal(events.length, 1);
    assert.equal(events[0].queryText, query);
    assert.equal(events[0].resultCount, 0);
    await input.press('Enter');
    await page.waitForTimeout(200);
    assert.equal(events.length, 1, `${name}: double submission must be deduplicated`);

    await input.fill('صيدلية');
    const successful = page.waitForResponse((response) => response.url().includes('/directory-intake') && response.request().postDataJSON()?.eventType === 'search');
    await input.press('Enter');
    await successful;
    assert.equal(events.length, 2);
    assert.ok(events[1].resultCount > 0);
    assert.equal(events[1].queryText, undefined);
    await input.fill('كشير بسوبر ماركت');
    const jobLink = page.getByRole('link', { name: 'افتح بحث الوظائف ←' });
    await jobLink.waitFor({ state: 'visible' });
    assert.equal(new URL(await jobLink.getAttribute('href'), baseURL).searchParams.get('q'), 'كاشير');
    assert.equal(await page.getByRole('link', { name: 'اقترح نتيجة مفقودة' }).count(), 0, `${name}: job requests must not ask for a missing business`);
    const jobSearch = page.waitForResponse((response) => response.url().includes('/directory-intake') && response.request().postDataJSON()?.eventType === 'search');
    await input.press('Enter');
    await jobSearch;
    assert.equal(events.length, 3);
    assert.equal(events[2].resultCount, 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, `${name}: search controls must fit the viewport`);
    report.push({ viewport: name, noKeystrokeEvents: true, submittedEvents: events.length, directoryCashierRoute: true, privateSuccessQuery: true, horizontalOverflow: overflow });
    await page.close();

    const filterOnly = await isolatedPage({ width, height });
    await filterOnly.page.goto(`${baseURL}/directory/?category=${encodeURIComponent('الطب والصحة')}`, { waitUntil: 'networkidle' });
    await filterOnly.page.waitForTimeout(1_150);
    assert.equal(filterOnly.events.length, 0, `${name}: opening a filtered category is not a text search`);
    await filterOnly.page.close();
  }

  // Replacing the query must immediately remove results from the previous query.
  for (const surface of ['home', 'global']) {
    const { page, events } = await isolatedPage({ width: 390, height: 844 });
    await page.route('**/api/site-search/**', async (route) => {
      const query = new URL(route.request().url()).searchParams.get('q');
      if (query !== 'سابق') await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({ json: { items: query === 'سابق'
        ? [{ kind: 'listing', title: 'نتيجة سابقة للاختبار', subtitle: 'بيانات اختبار فقط', href: '/directory/', badge: 'اختبار' }]
        : [], suggestions: [] } });
    });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    if (surface === 'global') await page.getByRole('button', { name: 'البحث في دليل نقادة', exact: true }).click();
    const input = page.locator(surface === 'home' ? '#home-search' : '#global-site-search');
    await input.fill('سابق');
    await page.getByText('نتيجة سابقة للاختبار', { exact: true }).waitFor({ state: 'visible' });
    const updated = page.waitForResponse((response) => response.url().includes('/api/site-search/') && new URL(response.url()).searchParams.get('q') === 'تخاطب');
    await input.fill('تخاطب');
    assert.equal(await page.getByText('نتيجة سابقة للاختبار', { exact: true }).count(), 0, `${surface}: stale results remain selectable`);
    assert.equal(events.length, 0);
    await updated;
    report.push({ surface, staleResultsCleared: true, suggestionRequestsDoNotCount: true });
    await page.close();
  }

  const { page } = await isolatedPage({ width: 390, height: 844 });
  for (const query of ['مركز تخاطب', 'معمل دكتور لاب', 'اولتد الشبخ للقماش', 'دكتور عاطف']) {
    const response = await page.request.get(`${baseURL}/api/site-search/?q=${encodeURIComponent(query)}`);
    assert.equal(response.status(), 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.items) && Array.isArray(body.suggestions));
    for (const suggestion of body.suggestions) {
      assert.ok(!['مركز', 'دكتور', 'معمل دكتور', 'أولاد الشيخ'].includes(suggestion.query), `unrelated recovery for ${query}`);
    }
  }
  const cashier = await page.request.get(`${baseURL}/api/site-search/?q=${encodeURIComponent('كشير بسوبر ماركت')}`);
  const cashierBody = await cashier.json();
  assert.ok(cashierBody.items.some((item) => item.href.startsWith('/jobs?') && new URL(item.href, baseURL).searchParams.get('q') === 'كاشير'));
  report.push({ liveSearchAPI: true, cashierProfessionPreserved: true, genericRecoveryRemoved: true });
  await page.close();
  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile('artifacts/search-quality-checks.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
