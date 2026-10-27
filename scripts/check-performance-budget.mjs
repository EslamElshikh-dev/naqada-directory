import { readFileSync, writeFileSync } from 'node:fs';

const budgets = JSON.parse(readFileSync(new URL('../performance-budgets.json', import.meta.url), 'utf8'));
const files = process.argv.slice(2);
if (!files.length) throw new Error('Pass Lighthouse JSON reports; a missing report cannot pass the budget.');
const results = files.map(file => {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const requests = report.audits?.['network-requests']?.details?.items;
  const lcp = report.audits?.['largest-contentful-paint']?.numericValue;
  const cssBytes = Array.isArray(requests) ? requests.filter(item => item.resourceType === 'Stylesheet')
    .reduce((sum, item) => sum + (item.transferSize || 0), 0) : null;
  const failures = [];
  if (report.audits?.['http-status-code']?.score !== 1) failures.push('The public page did not return a successful HTTP response');
  if (cssBytes === null) failures.push('Missing stylesheet transfer data');
  else if (cssBytes > budgets.maxInitialCssTransferBytes) failures.push('Initial CSS exceeds ' + budgets.maxInitialCssTransferBytes + ' bytes');
  if (budgets.requireValidLcp && (!Number.isFinite(lcp) || lcp <= 0)) failures.push('No valid LCP; performance acceptance remains blocked');
  return { url: report.finalDisplayedUrl || report.finalUrl, cssBytes, lcp: Number.isFinite(lcp) ? lcp : null, failures, passed: !failures.length };
});
const summary = { budgets, passed: results.every(item => item.passed), results };
if (process.env.PERFORMANCE_SUMMARY_PATH) writeFileSync(process.env.PERFORMANCE_SUMMARY_PATH, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
