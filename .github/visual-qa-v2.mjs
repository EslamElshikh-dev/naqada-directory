import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = 'http://127.0.0.1:3000';
const routes = [
  ['home', '/'],
  ['directory', '/directory'],
  ['activities', '/activities'],
  ['coverage', '/coverage'],
  ['contribute', '/contribute'],
  ['village-bashlaw', '/villages/%D8%A8%D8%B4%D9%84%D8%A7%D9%88'],
  ['listing', '/listing/%D8%B5%D9%8A%D8%AF%D9%84%D9%8A%D9%87-%D8%AF-%D8%A7%D9%8A%D9%86%D8%A7%D8%B3-%D9%85%D8%AD%D9%85%D8%AF-%D9%85%D8%AF%D9%8A%D9%86%D9%87-%D9%86%D9%82%D8%A7%D8%AF%D9%87'],
  ['knowledge', '/knowledge'],
  ['about', '/about'],
  ['developer', '/developer'],
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
      mobileNavVisible: (() => {
        if (window.innerWidth > 980) return true;
        const nav = document.querySelector('nav[aria-label="التنقل على الجوال"]');
        if (!nav || getComputedStyle(nav).display === 'none') return false;
        const rect = nav.getBoundingClientRect();
        return rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight + 1;
      })(),
      heroControlsClipped: [...document.querySelectorAll('.home-hero .hero__content, .home-hero .hero-search, .home-hero .hero-search button[type="submit"]')].some((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1);
      }),
      categoryGridColumns: categoryGridStyle?.gridTemplateColumns || null,
      categoryCardCount: categoryGrid?.querySelectorAll('.category-card').length || 0,
    };
  });

  const status = response?.status() ?? 0;
  const key = `${routeName}-${viewportName}`;
  out.checks[key] = { status, ...metrics };
  if (!metrics.mobileNavVisible) out.failures.push(`${key}: mobile navigation missing or outside viewport`);
  if (metrics.heroControlsClipped) out.failures.push(`${key}: homepage content or search button clipped by viewport`);
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

// Sanad: a compact non-modal conversation integrated into the mobile navigation.
for (const [name, width, height] of [['small-mobile', 320, 640], ['mobile', 390, 844], ['desktop', 1440, 1000]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  const launcher = page.getByRole('button', { name: 'افتح محادثة سند، مساعد دليل نقادة' });
  const icon = await launcher.boundingBox();
  if (!icon || Math.abs(icon.width - icon.height) > 1 || icon.width > 60) out.failures.push(`sanad-${name}: launcher must be a compact circle`);
  const mobileNav = page.locator('nav[aria-label="التنقل على الجوال"]');
  const nav = await mobileNav.count() ? await mobileNav.first().boundingBox() : null;
  if (width < 981 && icon && nav && nav.height) {
    const launcherCenter = icon.x + (icon.width / 2);
    const navCenter = nav.x + (nav.width / 2);
    if (Math.abs(launcherCenter - navCenter) > 2) out.failures.push(`sanad-${name}: launcher must be centered in the bottom navigation`);
    if (icon.y + icon.height <= nav.y || icon.y + icon.height > nav.y + nav.height + 1) out.failures.push(`sanad-${name}: launcher is not docked inside the bottom navigation`);
  }
  await page.screenshot({ path: `artifacts/sanad-${name}-closed.png` });
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: 'محادثة سند' });
  const panel = await dialog.boundingBox();
  if (!panel || panel.x < 0 || panel.y < 0 || panel.x + panel.width > width || panel.y + panel.height > height || panel.height > height * .65) out.failures.push(`sanad-${name}: chat is outside the viewport or too tall`);
  if (panel && nav && nav.height && panel.y + panel.height >= nav.y) out.failures.push(`sanad-${name}: chat overlaps bottom navigation`);
  if (width < 981 && await page.getByRole('textbox', { name: 'سؤالك لسند' }).evaluate(el => document.activeElement === el)) out.failures.push(`sanad-${name}: opening chat must not focus the mobile keyboard`);
  await page.getByRole('textbox', { name: 'سؤالك لسند' }).fill('حضانة النجوم الصغيرة');
  await page.getByRole('button', { name: 'إرسال السؤال' }).click();
  await dialog.getByRole('link', { name: /حضانة النجوم الصغيرة/ }).waitFor();
  await page.getByRole('button', { name: 'رقمها', exact: true }).click();
  await dialog.getByText('دي الأرقام المنشورة المتاحة للنتائج المطابقة. تقدر تضغط «اتصال» مباشرة.').waitFor();
  await page.screenshot({ path: `artifacts/sanad-${name}-open.png` });
  await page.getByRole('textbox', { name: 'سؤالك لسند' }).press('Escape');
  if (await dialog.count()) out.failures.push(`sanad-${name}: Escape did not close chat`);
  out.checks[`sanad-${name}`] = { icon, panel, nav, conversation: 'passed' };
  await page.close();
}

await fs.writeFile('artifacts/visual-qa-v2-diagnostics.json', JSON.stringify(out, null, 2));
await browser.close();

if (out.failures.length) {
  console.error(out.failures.join('\n'));
  process.exit(1);
}
