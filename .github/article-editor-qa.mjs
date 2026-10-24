import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { isolatedPage } from './qa-browser-page.mjs';

await mkdir('artifacts/article-editor', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[390, 844], [1440, 1000]]) {
    for (const fixture of ['qa-article-editor', 'qa-role-model']) {
      const page = await isolatedPage(browser, { viewport: { width, height } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const saves = [];
      let uploads = 0;
      await page.route('**/api/moderator/article-media', async route => {
        uploads++;
        const content = saves[0].document.content;
        const image = content.hero || content.photos[0];
        await route.fulfill({ json: { src: image.asset || image.src, width: image.width, height: image.height } });
      });
      await page.route('**/api/moderator/article', async route => {
        const body = route.request().postDataJSON(); saves.push(body);
        await route.fulfill({ json: { ok: true, slug: body.slug, version: '2026-10-16T17:00:00.000Z', document: body.document } });
      });
      const response = await page.goto(`http://127.0.0.1:3000/${fixture}/`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, 'editor fixture route is missing');
      const dialog = page.getByRole('dialog', { name: 'محرر المقال الكامل' });
      await dialog.waitFor();
      const field = fixture === 'qa-role-model' ? 'عنوان المقال' : 'عنوان المقال';
      const title = dialog.getByLabel(field, { exact: true });
      await title.fill('عنوان اختبار محفوظ مع الصور والأقسام');
      await dialog.getByRole('button', { name: 'النص والأقسام', exact: true }).click();
      const textareas = await dialog.locator('textarea').count();
      assert.ok(textareas >= 2, 'full article text is missing');
      await dialog.getByRole('button', { name: 'حفظ مسودة', exact: true }).click();
      await dialog.getByRole('status').filter({ hasText: 'المسودة اتحفظت' }).waitFor();
      assert.equal(saves.length, 1);
      assert.equal(saves[0].status, 'draft');
      assert.ok(saves[0].document.content.sections.length > 1);
      assert.ok(fixture === 'qa-role-model' ? saves[0].document.content.photos.length : saves[0].document.content.hero.asset);
      await dialog.getByRole('button', { name: 'الصور والغلاف', exact: true }).click();
      await dialog.getByText('استبدال الصورة', { exact: true }).first().waitFor();
      const fileInput = dialog.locator('input[type=file]').first();
      await fileInput.setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(4_000_001) });
      await dialog.getByRole('alert').filter({ hasText: '٤ ميجابايت' }).waitFor();
      assert.equal(uploads, 0, 'oversized photos must be rejected before a network request');
      await fileInput.setInputFiles({ name: 'small.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl/IAAAAASUVORK5CYII=', 'base64') });
      await page.screenshot({ path: `artifacts/article-editor/${fixture}-${width}.png`, fullPage: true });
      const overflow = await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 1);
      assert.equal(overflow, false, 'editor overflows horizontally');
      await dialog.getByRole('button', { name: 'السيو والمشاركة', exact: true }).click();
      assert.equal(uploads, 1, 'small photos should use the authenticated upload endpoint');
      await dialog.getByLabel('عنوان المشاركة', { exact: true }).fill('عنوان مشاركة مختلف');
      await dialog.getByRole('button', { name: 'نشر التعديلات', exact: true }).click();
      await dialog.getByRole('status').filter({ hasText: 'تم نشر المقال' }).waitFor();
      assert.equal(saves.at(-1).document.sharing.title, 'عنوان مشاركة مختلف');
      assert.equal(saves.at(-1).status, 'published');
      assert.equal(errors.length, 0, errors.join('\n'));
      await page.close();
    }
  }
  console.log('Complete article editor: desktop/mobile fields, image retention, draft and publish payloads passed.');
} finally { await browser.close(); }
