import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const base = process.env.LCP_QA_BASE_URL || 'http://127.0.0.1:3000';
const folder = process.env.LCP_QA_OUTPUT || 'artifacts/home-lcp';
let paths = process.env.LCP_QA_PATHS ? JSON.parse(process.env.LCP_QA_PATHS) : ['/'];
if (process.env.LCP_QA_REPRESENTATIVE === '1') {
  const directory = await fetch(new URL('/directory/', base)).then(response => response.text());
  const listing = directory.match(/href="(\/listing\/[^"?]+)"/)?.[1];
  if (!listing) throw Error('A published listing is required');
  paths = ['/', listing, '/villages/الخطاره/', '/blog/naqada-civilization-history/'];
}
await mkdir(folder, { recursive: true });
const reports = [];
for (let index = 0; index < paths.length; index++) {
  for (let run = 1; run <= Number(process.env.LCP_QA_RUNS || 3); run++) {
    const browser = await chromium.launch({ headless: true,
      args: ['--remote-debugging-port=9222', ...(process.env.LCP_QA_PROXY ? ['--proxy-server=' + process.env.LCP_QA_PROXY] : [])] });
    try {
      const result = await lighthouse(new URL(paths[index], base).href, {
        port: 9222, logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        blockedUrlPatterns: ['*://connect.facebook.net/*', '*://www.facebook.com/*', '*/api/analytics/*', '*://*/_vercel/insights/*', '*://*/_vercel/speed-insights/vitals*'],
      });
      if (!result?.lhr) throw Error('No Lighthouse report');
      const file = `${folder}/page-${index}-run-${run}.json`;
      await writeFile(file, JSON.stringify(result.lhr));
      reports.push(file);
      const a = result.lhr.audits;
      const image = a['network-requests'].details.items.find(item => item.url.includes('naqada-home'));
      console.log(JSON.stringify({ index, run, url: result.lhr.finalDisplayedUrl,
        scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, value.score * 100])),
        lcp: a['largest-contentful-paint'].numericValue, fcp: a['first-contentful-paint'].numericValue,
        tbt: a['total-blocking-time'].numericValue, cls: a['cumulative-layout-shift'].numericValue,
        lcpElement: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector,
        image, warnings: result.lhr.runWarnings, error: result.lhr.runtimeError }));
    } finally { await browser.close(); }
  }
}
const checked = spawnSync(process.execPath, ['scripts/check-performance-budget.mjs', ...reports], {
  stdio: 'inherit', env: { ...process.env, PERFORMANCE_SUMMARY_PATH: `${folder}/summary.json` },
});
if (checked.error) throw checked.error;
process.exitCode = checked.status ?? 1;
