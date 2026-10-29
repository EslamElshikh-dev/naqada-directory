import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { localTlsBrowserArgs, verifyPerformanceTransport } from './performance-transport.mjs';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const folder = 'artifacts/performance';
await mkdir(folder, { recursive: true });
const directory = await fetch(base + '/directory/').then(response => response.text());
const listing = directory.match(/href="(\/listing\/[^"?]+)"/)?.[1];
if (!listing) throw new Error('A published listing is required for performance acceptance');
const paths = ['/', listing, '/villages/الخطاره/', '/blog/naqada-civilization-history/'];
const reports = [];
for (let index = 0; index < paths.length; index++) {
  const browser = await chromium.launch({ headless: true, args: ['--remote-debugging-port=9222', ...localTlsBrowserArgs(base)] });
  try {
    const result = await lighthouse(new URL(paths[index], base).href, {
      port: 9222, logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      blockedUrlPatterns: ['*://connect.facebook.net/*', '*://www.facebook.com/*'],
    });
    if (!result?.lhr) throw new Error('Lighthouse did not produce a report for ' + paths[index]);
    verifyPerformanceTransport(result.lhr);
    const file = folder + '/page-' + index + '.json';
    await writeFile(file, JSON.stringify(result.lhr));
    reports.push(file);
  } finally { await browser.close(); }
}
const result = spawnSync(process.execPath, ['scripts/check-performance-budget.mjs', ...reports], {
  stdio: 'inherit', env: { ...process.env, PERFORMANCE_SUMMARY_PATH: folder + '/summary.json' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
