import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 42,
          background: '#2d1e18',
          color: '#f6efe6',
          border: '10px solid #d6a85f',
          fontFamily: 'sans-serif',
          fontSize: 104,
          fontWeight: 900,
        }}
      >
        ن
      </div>
    ),
    size,
  );
}
