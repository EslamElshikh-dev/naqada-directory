import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = 'http://127.0.0.1:3000';
const out = { generatedAt: new Date().toISOString(), checks: {} };
const browser = await chromium.launch({ headless: true });

async function settlePage(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

async function inspectRoute(name, path, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
  await settlePage(page);
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const all = [...document.querySelectorAll('*')];
    const overflowing = all.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className.slice(0, 180) : '',
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
        left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10,
        width: Math.round(r.width * 10) / 10,
      };
    }).filter((x) => x.width > 0 && (x.left < -1 || x.right > window.innerWidth + 1)).slice(0, 30);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      horizontalOverflow: Math.max(doc.scrollWidth, body.scrollWidth) > window.innerWidth + 1,
      overflowing,
    };
  });
  out.checks[name] = { status: response?.status(), ...metrics };
  await page.close();
}

await inspectRoute('home-390', '/', 390, 844);
await inspectRoute('directory-390', '/directory', 390, 844);
await inspectRoute('village-390', '/villages/%D8%A8%D8%B4%D9%84%D8%A7%D9%88', 390, 844);
await inspectRoute('knowledge-390', '/knowledge/places/%D9%85%D8%AF%D9%8A%D9%86%D8%A9-%D9%86%D9%82%D8%A7%D8%AF%D8%A9', 390, 844);
await inspectRoute('blog-390', '/blog/bashlaw-today-quran-youth-education', 390, 844);

{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseURL}/listing/%D8%B5%D9%8A%D8%AF%D9%84%D9%8A%D9%87-%D8%AF-%D8%A7%D9%8A%D9%86%D8%A7%D8%B3-%D9%85%D8%AD%D9%85%D8%AF-%D9%85%D8%AF%D9%8A%D9%86%D9%87-%D9%86%D9%82%D8%A7%D8%AF%D9%87`, { waitUntil: 'networkidle' });
  await settlePage(page);
  out.checks['listing-actions-390'] = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    pageScrollWidth: document.documentElement.scrollWidth,
    groups: [...document.querySelectorAll('.listing-card__actions')].map((group, index) => {
      const style = getComputedStyle(group);
      const r = group.getBoundingClientRect();
      return {
        index,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        width: r.width,
        buttons: [...group.querySelectorAll('a,button')].map((el) => {
          const b = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            text: (el.textContent || '').trim().replace(/\s+/g, ' '),
            width: Math.round(b.width * 10) / 10,
            height: Math.round(b.height * 10) / 10,
            whiteSpace: cs.whiteSpace,
            fontSize: cs.fontSize,
            writingMode: cs.writingMode,
            overflowWrap: cs.overflowWrap,
          };
        }),
      };
    }),
  }));
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${baseURL}/blog/bashlaw-today-quran-youth-education`, { waitUntil: 'networkidle' });
  await settlePage(page);
  out.checks['blog-images-desktop'] = await page.evaluate(() => ({
    images: [...document.images].map((img) => {
      const r = img.getBoundingClientRect();
      return {
        src: img.getAttribute('src'),
        currentSrc: img.currentSrc,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedWidth: Math.round(r.width),
        renderedHeight: Math.round(r.height),
        loading: img.loading,
      };
    }),
  }));
  await page.screenshot({ path: 'artifacts/desktop/blog-article-settled.png', fullPage: true });
  await page.close();
}

await fs.writeFile('artifacts/visual-qa-diagnostics.json', JSON.stringify(out, null, 2));
await browser.close();
