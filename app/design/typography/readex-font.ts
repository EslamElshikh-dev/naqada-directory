import localFont from 'next/font/local';

// This alternative is only used by the typography comparison page.
export const readexFont = localFont({
  src: [{ path: '../../fonts/readex-pro-variable.woff2', weight: '160 700', style: 'normal' }],
  declarations: [{ prop: 'font-family', value: 'Readex Pro' }],
  variable: '--font-readex-fallback', display: 'swap', adjustFontFallback: 'Arial', preload: false,
});
