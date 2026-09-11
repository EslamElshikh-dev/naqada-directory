import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = 'http://127.0.0.1:3000';
const routes = [
  ['home', '/'],
  ['directory', '/directory'],
  ['activities', '/activities'],
  ['village-bashlaw', '/villages/%D8%A8%D8%B4%D9%84%D8%A7%D9%88'],
  ['listing', '/listing/%D8%B5%D9%8A%D8%AF%D9%84%D9%8A%D9%87-%D8%AF-%D8%A7%D9%8A%D9%86%D8%A7%D8%B3-%D9%85%D8%AD%D9%85%D8%AF-%D9%85%D8%AF%D9%8A%D9%86%D9%87-%D9%86%D9%82%D8%A7%D8%AF%D9%87'],
  ['knowledge-place', '/knowledge/places/%D9%85%D8%AF%D9%8A%D9%86%D8%A9-%D9%86%D9%82%D8%A7%D8%AF%D8%A9'],
  ['blog', '/blog'],
  ['blog-article', '/blog/bashlaw-today-quran-youth-education'],
];
const viewports = [
  ['mobile-390', 390, 844],
  ['mobile-430', 430, 932],
  ['tablet-768', 768, 1024],
  ['desktop-1440', 1440, 1000],
];

const out = { generatedAt: new Date().toISOString(), checks: {}, failures: [] };
const browser = await chromium.launch({ headless: true });

async function settlePage(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

async function inspectRoute(viewportName, width, height, routeName, path) {
  const page = await browser.newPage({ viewport: { width, height } });
  const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
  await settlePage(page);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const all = [...document.querySelectorAll('*')];
    const overflowing = all.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className.slice(0, 160) : '',
        left: Math.round(rect.left * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
      };
    }).filter((item) => item.width > 0 && (item.left < -1 || item.right > window.innerWidth + 1)).slice(0, 20);

    const categoryGrid = document.querySelector('.category-grid');
    const categoryGridStyle = categoryGrid ? getComputedStyle(categoryGrid) : null;

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth,
      horizontalOverflow: scrollWidth > window.innerWidth + 1,
      overflowing,
      categoryGridColumns: categoryGridStyle?.gridTemplateColumns || null,
      categoryCardCount: categoryGrid?.querySelectorAll('.category-card').length || 0,
    };
  });

  const status = response?.status() ?? 0;
  const key = `${routeName}-${viewportName}`;
  out.checks[key] = { status, ...metrics };
  if (status !== 200) out.failures.push(`${key}: HTTP ${status}`);
  if (metrics.horizontalOverflow) out.failures.push(`${key}: document horizontal overflow (${metrics.scrollWidth}px > ${width}px)`);

  await page.screenshot({ path: `artifacts/${viewportName}/${routeName}.png`, fullPage: true });
  await page.close();
}

for (const [viewportName, width, height] of viewports) {
  await fs.mkdir(`artifacts/${viewportName}`, { recursive: true });
  for (const [routeName, path] of routes) {
    await inspectRoute(viewportName, width, height, routeName, path);
  }
}

for (const [viewportName, width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${baseURL}/blog/bashlaw-today-quran-youth-education`, { waitUntil: 'networkidle' });
  await settlePage(page);
  const images = await page.evaluate(() => [...document.querySelectorAll('main#main-content article figure > img')].map((img) => {
    const rect = img.getBoundingClientRect();
    const naturalRatio = img.naturalHeight ? img.naturalWidth / img.naturalHeight : null;
    const renderedRatio = rect.height ? rect.width / rect.height : null;
    return {
      src: img.getAttribute('src'),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: Math.round(rect.width),
      renderedHeight: Math.round(rect.height),
      naturalRatio,
      renderedRatio,
      ratioDelta: naturalRatio && renderedRatio ? Math.abs(naturalRatio - renderedRatio) : null,
    };
  }));
  out.checks[`blog-image-ratios-${viewportName}`] = images;
  for (const image of images) {
    if (image.ratioDelta !== null && image.ratioDelta > 0.03) {
      out.failures.push(`blog-image-ratios-${viewportName}: aspect ratio drift ${image.ratioDelta.toFixed(3)} for ${image.src}`);
    }
  }
  await page.close();
}

for (const viewportName of ['mobile-390', 'mobile-430']) {
  const check = out.checks[`activities-${viewportName}`];
  if (check?.categoryCardCount > 0) {
    const columns = (check.categoryGridColumns || '').trim().split(/\s+/).filter(Boolean).length;
    if (columns < 2) out.failures.push(`activities-${viewportName}: expected two-column category grid, got ${check.categoryGridColumns}`);
  }
}

await fs.writeFile('artifacts/visual-qa-v2-diagnostics.json', JSON.stringify(out, null, 2));
await browser.close();

if (out.failures.length) {
  console.error(out.failures.join('\n'));
  process.exit(1);
}
