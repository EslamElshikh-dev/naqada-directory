import React from 'react';
import { ImageResponse } from 'next/og';

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size: rawSize } = await context.params;
  const dimension = rawSize === '512' ? 512 : rawSize === '192' ? 192 : null;

  if (!dimension) {
    return new Response('Not found', { status: 404 });
  }

  const fontSize = Math.round(dimension * 0.57);
  const borderWidth = Math.max(8, Math.round(dimension * 0.055));
  const radius = Math.round(dimension * 0.24);

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
          borderRadius: radius,
          background: '#2d1e18',
          color: '#f6efe6',
          border: `${borderWidth}px solid #d6a85f`,
          fontFamily: 'sans-serif',
          fontSize,
          fontWeight: 900,
        },
      },
      'ن',
    ),
    { width: dimension, height: dimension },
  );
}
