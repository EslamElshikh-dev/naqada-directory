import { ImageResponse } from 'next/og';

export const alt = 'دليل نقادة — الموسوعة المحلية لمركز نقادة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#2d1e18',
          color: '#f6efe6',
          fontFamily: 'sans-serif',
          direction: 'rtl',
        }}
      >
        <div style={{ position: 'absolute', width: 470, height: 470, borderRadius: 999, border: '2px solid rgba(214,168,95,.22)', left: -110, top: -120 }} />
        <div style={{ position: 'absolute', width: 290, height: 290, borderRadius: 999, background: 'rgba(214,168,95,.08)', right: -80, bottom: -80 }} />
        <div style={{ display: 'flex', width: '100%', padding: '72px 82px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 790 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#d6a85f', fontSize: 28, marginBottom: 24 }}>
              <span>نقادة · قنا</span><span style={{ width: 54, height: 2, background: '#d6a85f' }} /><span>NAQADA DIRECTORY</span>
            </div>
            <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.15, fontWeight: 800, marginBottom: 28 }}>دليل نقادة</div>
            <div style={{ display: 'flex', fontSize: 34, lineHeight: 1.55, color: '#eadbc9' }}>الموسوعة المحلية لمركز نقادة — خدمات ومكان وذاكرة للناس في دليل واحد.</div>
            <div style={{ display: 'flex', marginTop: 40, gap: 14, fontSize: 23, color: '#d8c4ad' }}>
              <span>القرى والنجوع</span><span>•</span><span>الخدمات</span><span>•</span><span>العائلات</span><span>•</span><span>الحكايات المحلية</span>
            </div>
          </div>
          <div style={{ display: 'flex', width: 220, height: 220, borderRadius: 58, alignItems: 'center', justifyContent: 'center', background: '#f6efe6', border: '8px solid rgba(214,168,95,.45)', boxShadow: '0 24px 70px rgba(0,0,0,.24)', color: '#2d1e18', fontSize: 118, fontWeight: 900 }}>ن</div>
        </div>
      </div>
    ),
    size,
  );
}
