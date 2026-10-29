import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const directory = await fetch(new URL('/directory/', base)).then(response => response.text());
const listing = directory.match(/href="(\/listing\/[^"?]+)"/)?.[1];
if (!listing) throw new Error('A published listing is required');
const paths = ['/', listing, '/villages/الخطاره/', '/blog/naqada-civilization-history/', '/search/?q=صيدليات'];
const browser = await chromium.launch({ headless: true, ...(process.env.QA_CHROMIUM_PATH ? {
  executablePath: process.env.QA_CHROMIUM_PATH, args: JSON.parse(process.env.QA_CHROMIUM_ARGS || '[]'),
} : {}) });
const failures = [];
try {
  for (const width of [390, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/api/analytics/**', route => route.fulfill({ status: 204 }));
    await context.route('https://connect.facebook.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    for (const path of paths) {
      const page = await context.newPage();
      const response = await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
      // Background news/account requests are unrelated to typography readiness.
      await page.locator('main h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const texts = [...document.querySelectorAll('body *')].filter(element => {
          const style = getComputedStyle(element);
          return !element.closest('[aria-hidden="true"]') && element.getClientRects().length && style.visibility !== 'hidden' && style.opacity !== '0' &&
            [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        });
        const rows = texts.map(element => {
          const s = getComputedStyle(element);
          return { text: element.textContent.trim().slice(0, 80), family: s.fontFamily, size: parseFloat(s.fontSize),
            weight: parseFloat(s.fontWeight), spacing: parseFloat(s.letterSpacing) || 0, color: s.color };
        }).filter(row => row.size !== 0 || /[\p{L}\p{N}]/u.test(row.text));
        return { bodyChoice: document.documentElement.dataset.bodyFont, sizes: [...new Set(rows.map(row => row.size))], colors: [...new Set(rows.map(row => row.color))],
          violations: rows.filter(row => row.size < 12 || row.weight > 700 || row.spacing < 0 || !/noto|plex|readex/i.test(row.family)),
          fonts: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family),
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      const loaded = result.fonts.includes('Noto Kufi Arabic') && result.fonts.includes(result.bodyChoice === 'readex' ? 'Readex Pro' : 'IBM Plex Sans Arabic');
      const ok = response.ok() && loaded && result.sizes.length <= 10 && result.colors.length <= 12 && !result.violations.length && !result.overflow;
      console.log(JSON.stringify({ path, width, status: response.status(), ok, ...result }));
      if (!ok) failures.push({ path, width });
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
if (failures.length) { console.error('Typography audit failed:', failures); process.exitCode = 1; }
