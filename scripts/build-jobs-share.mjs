import sharp from 'sharp';
import { join } from 'node:path';

const root = process.cwd();
const width = 1200;
const height = 630;
const target = join(root, 'public/images/social/naqada-jobs-share-2026.jpg');

// Use the same illustration and logo displayed on the jobs page and site.
const [people, logo] = await Promise.all([
  sharp(join(root, 'public/images/jobs/job-seekers-duo.webp'))
    .resize(550, 550)
    .png()
    .toBuffer(),
  sharp(join(root, 'public/app-icons/icon-192.png'))
    .resize(75, 75)
    .png()
    .toBuffer(),
]);

const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="forest" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse"><stop stop-color="#174e3f"/><stop offset=".53" stop-color="#0e392f"/><stop offset="1" stop-color="#08291f"/></linearGradient>
    <radialGradient id="glow" cx="275" cy="315" r="450" gradientUnits="userSpaceOnUse"><stop stop-color="#b48742" stop-opacity=".36"/><stop offset="1" stop-color="#b48742" stop-opacity="0"/></radialGradient>
    <linearGradient id="line" x1="590" y1="100" x2="590" y2="550" gradientUnits="userSpaceOnUse"><stop stop-color="#f5d393" stop-opacity="0"/><stop offset=".5" stop-color="#f5d393" stop-opacity=".8"/><stop offset="1" stop-color="#f5d393" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#forest)"/>
  <rect width="610" height="${height}" fill="url(#glow)"/>
  <circle cx="249" cy="311" r="239" fill="#edd4a0" fill-opacity=".045" stroke="#e8be73" stroke-opacity=".32" stroke-width="2"/>
  <circle cx="249" cy="311" r="285" fill="none" stroke="#e8be73" stroke-opacity=".15" stroke-width="2" stroke-dasharray="7 10"/>
  <circle cx="249" cy="311" r="344" fill="none" stroke="#e8be73" stroke-opacity=".08" stroke-width="2"/>
  <path d="M590 100v450" stroke="url(#line)" stroke-width="2"/>
  <path d="M620 112h43 M1100 112h43 M620 480h43 M1100 480h43" stroke="#e7bc73" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
  <rect x="0" y="${height - 8}" width="${width}" height="8" fill="#dcb16e"/>
</svg>`);

// Draw the badge before text so the call to action stays legible.
const badge = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect x="677" y="498" width="414" height="66" rx="33" fill="#ecc477"/></svg>');
const lettering = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g direction="rtl" unicode-bidi="embed" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold">
    <text x="949" y="88" font-size="32" fill="#fff6e6">دليل نقادة</text>
    <text x="884" y="174" font-size="30" fill="#ebc786">وظائف نقادة وقنا والأقصر</text>
    <text x="884" y="276" font-size="75" fill="#fff9ed">شغلك الجاي</text>
    <text x="884" y="375" font-size="72" fill="#ecc477">يمكن يكون هنا.</text>
    <text x="884" y="449" font-size="27" font-weight="normal" fill="#d6e2d7">دوّر على فرصة، أو اعرض وظيفة وخبرتك</text>
    <text x="884" y="549" font-size="27" fill="#173c30">من أهل البلد لأهل البلد</text>
  </g>
  <text x="884" y="603" text-anchor="middle" font-family="DejaVu Sans" font-size="20" fill="#bdcfbf">naqada-directory.vercel.app/jobs</text>
</svg>`);

await sharp(background)
  .composite([
    { input: people, left: 0, top: 73 },
    { input: logo, left: 1082, top: 35 },
    { input: badge, left: 0, top: 0 },
    { input: lettering, left: 0, top: 0 },
  ])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(target);

console.log(target);
