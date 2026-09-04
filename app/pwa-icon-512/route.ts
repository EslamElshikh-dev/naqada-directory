import React from 'react';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET() {
  const dimension = 512;
  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 122,
          background: '#2d1e18',
          color: '#f6efe6',
          border: '28px solid #d6a85f',
          fontFamily: 'sans-serif',
          fontSize: 292,
          fontWeight: 900,
        },
      },
      'ن',
    ),
    { width: dimension, height: dimension },
  );
}
