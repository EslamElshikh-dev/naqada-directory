import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import sharp from 'sharp';

test('the LCP photograph has complete responsive formats with bounded mobile payloads', async () => {
  const media = JSON.parse(await readFile(new URL('../lib/home-hero-media.json', import.meta.url)));
  const original = await readFile(new URL('../public/images/naqada-home.jpg', import.meta.url));
  assert.equal(media.sourceSha256, createHash('sha256').update(original).digest('hex'), 'Regenerate the hero after changing its photograph');
  for (const crop of ['full', 'mobile']) {
    for (const format of ['avif', 'webp']) {
      const images = media.variants.filter(image => image.format === format && image.crop === crop);
      assert.deepEqual(images.map(image => image.width), [384, 640, 750, 960, 1200, 1376]);
      for (const image of images) {
        const data = await readFile(new URL('../public' + image.path, import.meta.url));
        const decoded = await sharp(data).metadata();
        assert.equal(decoded.width, image.width);
        assert.equal(decoded.height, Math.round(image.width * (crop === 'mobile' ? 598 : media.height) / media.width));
        assert.equal(data.length, image.bytes);
        if (image.width === 750) assert.ok(data.length < (format === 'avif' ? 31000 : 72000), 'Mobile LCP photograph exceeds its transfer budget');
      }
    }
  }
});
