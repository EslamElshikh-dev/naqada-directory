import localFont from 'next/font/local';

export const BODY_FONT: 'plex' | 'readex' = 'plex';
export const displayFont = localFont({
  src: [
    { path: './fonts/noto-kufi-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  declarations: [{ prop: 'font-family', value: 'Noto Kufi Arabic' }],
  variable: '--font-display-fallback', display: 'swap', preload: true, adjustFontFallback: 'Arial',
});
export const displayFontVariable = displayFont.variable;
export const plexFont = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-arabic-400.woff2', weight: '400', style: 'normal' },
  ],
  declarations: [{ prop: 'font-family', value: 'IBM Plex Sans Arabic' }],
  variable: '--font-plex-fallback', display: 'swap', adjustFontFallback: 'Arial', preload: true,
});
const plexMediumFont = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-arabic-600.woff2', weight: '600', style: 'normal' },
  ],
  declarations: [{ prop: 'font-family', value: 'IBM Plex Sans Arabic' }],
  variable: '--font-plex-medium', display: 'swap', adjustFontFallback: 'Arial', preload: false,
});
export const readexFont = localFont({
  src: [{ path: './fonts/readex-pro-variable.woff2', weight: '160 700', style: 'normal' }],
  declarations: [{ prop: 'font-family', value: 'Readex Pro' }],
  variable: '--font-readex-fallback', display: 'swap', adjustFontFallback: 'Arial', preload: false,
});
export const bodyFontVariable = BODY_FONT === 'plex' ? plexFont.variable + ' ' + plexMediumFont.variable : readexFont.variable;
