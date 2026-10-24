// External writes from browser telemetry/intake use synthetic responses. Real
// application writes are exercised separately against disposable local services.
export async function isolatedPage(browser, options) {
  const page = await browser.newPage(options);
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!local && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      await route.fulfill({
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' },
        json: { ok: true, summary: { average: 0, count: 0, distribution: {} } },
      });
      return;
    }
    await route.continue();
  });
  return page;
}
