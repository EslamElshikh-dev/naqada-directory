import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { getNewsItem } from '@/lib/news';

export const runtime = 'nodejs';
export const alt = 'صورة الخبر وعنوانه ومصدره على دليل نقادة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function photoData(url: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4500), headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png' } });
    const mime = response.headers.get('content-type')?.split(';')[0] || '';
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)
      || Number(response.headers.get('content-length') || 0) > 5_000_000) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 5_000_000) return null;
    return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch { return null; }
}

export default async function NewsOpenGraph({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) notFound();
  const [photo, font] = await Promise.all([
    photoData(item.imageUrl),
    readFile(join(process.cwd(), 'app/fonts/dejavu-sans-bold.ttf')),
  ]);
  return new ImageResponse(
    <div dir="rtl" style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#09271e', color: '#fff', fontFamily: 'NaqadaArabic', overflow: 'hidden' }}>
      <div style={{ display: 'flex', position: 'relative', width: 540, height: 630, backgroundColor: '#215940', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {photo ? (
          <img src={photo} alt="" width={540} height={630} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : <span style={{ fontSize: 280, color: '#c69f56' }}>ن</span>}
        <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, backgroundColor: '#dfb764' }} />
      </div>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '48px 42px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 25, color: '#f3d58f' }}>
          <span>دليل نقادة</span><span style={{ fontSize: 17, color: '#9ec4ad' }}>أخبار نقادة وقنا</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <span style={{ color: '#f2c876', fontSize: 20 }}>{item.category} · {item.isNaqada ? 'نقادة' : 'قنا'}</span>
          <span style={{ fontSize: item.title.length > 125 ? 36 : item.title.length > 80 ? 42 : 50, lineHeight: 1.6, textAlign: 'right', maxHeight: 340, overflow: 'hidden' }}>{item.title}</span>
        </div>
        <div style={{ display: 'flex', borderTop: '2px solid #3b6654', paddingTop: 20, color: '#dce9df', fontSize: 20 }}><span>المصدر: {item.source}</span></div>
      </div>
    </div>,
    { ...size, fonts: [{ name: 'NaqadaArabic', data: font, weight: 700, style: 'normal' }] },
  );
}
