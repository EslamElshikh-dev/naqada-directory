import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import sharp from 'sharp';
import { getNewsItem, getNewsShareImageUrl } from '@/lib/news';

export const runtime = 'nodejs';
export const alt = 'صورة الخبر وعنوانه على أخبار نقادة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function photoData(url: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000), headers: { Accept: 'image/webp,image/jpeg,image/png' } });
    const mime = response.headers.get('content-type')?.split(';')[0] || '';
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)
      || Number(response.headers.get('content-length') || 0) > 5_000_000) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 5_000_000) return null;
    // ImageResponse can misrender WebP and smaller publisher images. Build the photo at the
    // final card dimensions before compositing, keeping the original photo as the source.
    const jpeg = await sharp(Buffer.from(bytes))
      .resize(size.width, size.height, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 92 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch { return null; }
}

function headlineLines(title: string) {
  const words = title.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= 34 || !line) { line = next; continue; }
    lines.push(line);
    line = word;
    if (lines.length === 3) break;
  }
  if (lines.length < 3 && line) lines.push(line);
  if (lines.join(' ').length < title.trim().length - 1 && lines.length === 3) {
    lines[2] = `${lines[2].replace(/[،؛:,.…\s]+$/u, '')}…`;
  }
  return lines;
}

export default async function NewsOpenGraph({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) notFound();
  const [imageUrl, font, icon] = await Promise.all([
    getNewsShareImageUrl(item),
    readFile(join(process.cwd(), 'app/fonts/dejavu-sans-bold.ttf')),
    readFile(join(process.cwd(), 'public/app-icons/icon-512.png')),
  ]);
  const photo = await photoData(imageUrl) || (imageUrl !== item.imageUrl ? await photoData(item.imageUrl) : null);
  const logo = `data:image/png;base64,${icon.toString('base64')}`;
  const lines = headlineLines(item.title);

  return new ImageResponse(
    <div dir="rtl" style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: '#143c30', color: '#fff', fontFamily: 'NaqadaArabic', overflow: 'hidden' }}>
      {photo ? (
        <img src={photo} alt="" width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }} />
      ) : <div style={{ display: 'flex', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #0b2b24, #246347)', color: '#d6b778', fontSize: 260 }}>ن</div>}

      <div style={{ display: 'flex', position: 'absolute', top: 0, right: 0, left: 0, height: 166, background: 'linear-gradient(90deg, rgba(7, 34, 28, .91), rgba(7, 34, 28, .97))' }}>
        <div style={{ display: 'flex', position: 'absolute', right: 38, top: 29, width: 135, height: 105, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', color: '#f2d18d', fontSize: 28, lineHeight: 1.4 }}>
          <span>أخبار</span><span>نقادة</span>
        </div>
        <div style={{ display: 'flex', position: 'absolute', right: 193, top: 42, width: 2, height: 82, backgroundColor: '#d0a96c', opacity: .8 }} />
        <div style={{ display: 'flex', position: 'absolute', top: 17, right: 219, left: 32, height: 135, flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', fontSize: lines.length > 2 ? 31 : 36, lineHeight: 1.4 }}>
          {lines.map((line, index) => <div key={index} style={{ display: 'flex', flexDirection: 'row-reverse', gap: 10, whiteSpace: 'nowrap' }}>
            {line.split(' ').map((word, wordIndex) => <span key={wordIndex}>{word}</span>)}
          </div>)}
        </div>
      </div>

      <div style={{ display: 'flex', position: 'absolute', top: 184, right: 28, width: 86, height: 86, padding: 5, alignItems: 'center', justifyContent: 'center', border: '2px solid #e4c286', borderRadius: 22, backgroundColor: 'rgba(8, 36, 29, .9)' }}>
        <img src={logo} alt="" width={72} height={72} style={{ width: 72, height: 72, borderRadius: 16 }} />
      </div>

      {photo && !item.isOriginal ? <div style={{ display: 'flex', position: 'absolute', bottom: 25, left: 30, padding: '9px 15px', borderRadius: 8, backgroundColor: 'rgba(6, 29, 24, .78)', color: '#fff', fontSize: 16 }}>الصورة: {item.source}</div> : null}
      <div style={{ display: 'flex', position: 'absolute', inset: 0, border: '6px solid #155039', pointerEvents: 'none' }} />
    </div>,
    { ...size, fonts: [{ name: 'NaqadaArabic', data: font, weight: 700, style: 'normal' }] },
  );
}
