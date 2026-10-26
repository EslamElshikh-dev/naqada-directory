import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { isolatedPage } from './qa-browser-page.mjs';

const baseURL = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const checks = [];
await fs.mkdir('artifacts/usability', { recursive: true });

async function usableInFirstScreen(page, locator) {
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  assert.ok(box && box.y >= 0 && box.y + box.height < page.viewportSize().height - 70, `Search is below the usable first screen: ${JSON.stringify(box)}`);
  await locator.click({ trial: true });
}

try {
  for (const width of [390, 430]) {
    const page = await isolatedPage(browser, { viewport: { width, height: 844 } });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const homeSearch = page.locator('main input[role="combobox"]');
    await usableInFirstScreen(page, homeSearch);
    await page.waitForFunction(() => /^[٠-٩0-9]+$/.test(document.querySelector('[aria-label="إحصاءات الدليل"] b')?.textContent?.trim() || ''));
    const homeCount = await page.locator('[aria-label="إحصاءات الدليل"] b').first().textContent();
    assert.equal(await page.getByRole('button', { name: 'إغلاق رسالة الترحيب' }).count(), 0);
    assert.equal(await page.locator('aside[aria-label="تثبيت تطبيق دليل نقادة"]').count(), 0);
    const tickerFont = await page.locator('section[aria-label="آخر أخبار وتحديثات دليل نقادة"] a strong').first().evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize));
    assert.ok(tickerFont >= 13, `Ticker text is too small: ${tickerFont}`);
    await page.screenshot({ path: `artifacts/usability/home-${width}.png` });

    await page.goto(`${baseURL}/directory/`, { waitUntil: 'domcontentloaded' });
    await usableInFirstScreen(page, page.locator('#directory-search-input'));
    const directoryCount = await page.locator('main dl div').filter({ has: page.getByText('نشاط منشور', { exact: true }) }).locator('dd').textContent();
    assert.equal(directoryCount, homeCount, 'Homepage and directory disagree on the public catalog size');
    const install = page.locator('aside[aria-label="تثبيت تطبيق دليل نقادة"]');
    await install.waitFor({ state: 'attached' });
    assert.equal(await install.evaluate(node => getComputedStyle(node).position), 'relative');
    await page.screenshot({ path: `artifacts/usability/directory-${width}.png` });
    await install.getByRole('button', { name: 'إغلاق تنبيه تثبيت التطبيق' }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#directory-search-input').waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    assert.equal(await install.count(), 0, 'Dismissed installation prompt returned after reload');

    await page.goto(`${baseURL}/villages/`, { waitUntil: 'domcontentloaded' });
    const villageCount = await page.locator('main dl div').filter({ has: page.getByText('نشاط منشور', { exact: true }) }).locator('dd').textContent();
    assert.equal(villageCount, directoryCount, 'Village hub and directory disagree on the public catalog size');
    await usableInFirstScreen(page, page.getByRole('searchbox', { name: 'ابحث عن قرية أو نجع' }));
    checks.push({ width, homeCount, directoryCount, villageCount, tickerFont, installInDocumentFlow: true, firstScreenSearch: true });
    await page.close();
  }
} finally {
  await fs.writeFile('artifacts/usability/results.json', JSON.stringify(checks, null, 2));
  await browser.close();
}
console.log(JSON.stringify(checks));
