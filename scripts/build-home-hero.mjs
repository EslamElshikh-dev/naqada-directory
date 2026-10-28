// Pre-encode the existing photograph; never run an image transform on its LCP request.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const source = await readFile('public/images/naqada-home.jpg');
const version = createHash('sha256').update(source).update('avif47-effort6-webp75-mobile23-v1').digest('hex').slice(0, 12);
const folder = `public/images/home-hero/${version}`;
await mkdir(folder, { recursive: true });
const widths = [384, 640, 750, 960, 1200, 1376];
const variants = [];
for (const crop of ['full', 'mobile']) {
  for (const width of widths) {
    for (const format of ['avif', 'webp']) {
      // AVIF quality 47 matches Next 16.4's mapping of its default quality 75.
      // Higher encoding effort costs generation time only.
      let pipeline = sharp(source).rotate();
      // At >=375px the mobile frame is wider than 2.3:1. These pixels are already
      // outside object-fit:cover. Matching its 53% position preserves the visible scene.
      if (crop === 'mobile') pipeline = pipeline.extract({ left: 0, top: 90, width: 1376, height: 598 });
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
      const buffer = await (format === 'avif' ? pipeline.avif({ quality: 47, effort: 6 }) : pipeline.webp({ quality: 75 })).toBuffer();
      const path = `/images/home-hero/${version}/naqada-home-${crop}-${width}.${format}`;
      await writeFile('public' + path, buffer);
      variants.push({ width, format, crop, path, bytes: buffer.length });
    }
  }
}
await writeFile('lib/home-hero-media.json', JSON.stringify({
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  width: 1376, height: 768, variants,
}, null, 2) + '\n');
console.log(JSON.stringify(variants));
