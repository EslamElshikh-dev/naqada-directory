/* eslint-disable @next/next/no-img-element -- Raster layers are rendered by ImageResponse, not a browser. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

function escapeMarkup(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
}

export async function socialCard(title: string, subtitle: string) {
  const fontfile = join(process.cwd(), 'app/fonts/noto-kufi-arabic-og.ttf');
  await readFile(fontfile); // Keep the shaping font in the server's traced deployment files.
  const text = async (value: string, size: number, height: number, color: string) => {
    const bytes = await sharp({ text: { text: '<span foreground="' + color + '">' + escapeMarkup(value) + '</span>',
      font: 'Noto Kufi Arabic Bold ' + size, fontfile, width: 1050, height, align: 'right', rgba: true } }).png().toBuffer();
    return 'data:image/png;base64,' + bytes.toString('base64');
  };
  const [heading, detail, brand] = await Promise.all([
    text(title.slice(0, 105), 52, 230, '#ffffff'),
    text(subtitle.slice(0, 110), 26, 100, '#dce9e1'),
    text('دليل نقادة', 28, 70, '#edcb7a'),
  ]);
  const image = new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', width: 1200, height: 630,
    padding: '48px 64px', background: 'linear-gradient(135deg, #102c24, #1b5844)', borderBottom: '12px solid #edcb7a', alignItems: 'flex-end', justifyContent: 'space-between' }}>
    <img src={brand} alt="" width={1050} height={70} style={{ objectFit: 'contain', objectPosition: 'right' }} />
    <img src={heading} alt="" width={1050} height={230} style={{ objectFit: 'contain', objectPosition: 'right' }} />
    <img src={detail} alt="" width={1050} height={100} style={{ objectFit: 'contain', objectPosition: 'right' }} />
  </div>, { width: 1200, height: 630 });
  let jpeg = await sharp(Buffer.from(await image.arrayBuffer())).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  if (jpeg.length > 90_000) jpeg = await sharp(jpeg).jpeg({ quality: 60, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
}
