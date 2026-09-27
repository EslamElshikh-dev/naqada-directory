import sharp from 'sharp';
import { join } from 'node:path';

const root = process.cwd();
const source = join(root, 'public/images/role-models/mahmoud-ahmed-abdel-sabour');
const target = join(root, 'public/images/social/mahmoud-danfiq-share-2026.jpg');
const width = 1200;
const height = 630;
const photoHeight = 444;

// Crop only the original photos. Keep the face and the top of the head in view.
const panels = [
  { file: 'portrait.jpg', left: 0, width: 556, crop: { left: 0, top: 0, width: 1536, height: 1227 } },
  { file: 'office.jpg', left: 560, width: 327, crop: { left: 270, top: 0, width: 990, height: 1344 } },
  { file: 'training.jpg', left: 891, width: 309, crop: { left: 0, top: 0, width: 994, height: 1430 } },
];

const photos = await Promise.all(panels.map(async (panel) => ({
  input: await sharp(join(source, panel.file))
    .extract(panel.crop)
    .resize(panel.width, photoHeight, { fit: 'fill' })
    .png()
    .toBuffer(),
  left: panel.left,
  top: 0,
})));

const typography = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#d9b879" stroke-width="10"/>
  <rect x="556" y="0" width="4" height="${photoHeight}" fill="#d9b879"/>
  <rect x="887" y="0" width="4" height="${photoHeight}" fill="#d9b879"/>
  <rect x="0" y="${photoHeight}" width="${width}" height="5" fill="#d9b879"/>
  <text x="600" y="535" text-anchor="middle" direction="rtl" unicode-bidi="embed" font-family="Noto Kufi Arabic, DejaVu Sans" font-size="61" font-weight="bold" fill="#fff8e8">شهيد دنفيق _ فخر نقادة</text>
  <path d="M403 588h112 M685 588h112" stroke="#d9b879" stroke-width="2" stroke-linecap="round"/>
  <text x="600" y="600" text-anchor="middle" direction="rtl" unicode-bidi="embed" font-family="Noto Kufi Arabic, DejaVu Sans" font-size="24" font-weight="bold" fill="#e7c588">دليل نقادة</text>
</svg>`);

await sharp({
  create: { width, height, channels: 3, background: '#103d33' },
})
  .composite([...photos, { input: typography, left: 0, top: 0 }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(target);

console.log(target);
