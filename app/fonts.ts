import localFont from 'next/font/local';

export const BODY_FONT: 'plex' | 'readex' = 'plex';
export const displayFont = localFont({
  src: [
    { path: './fonts/noto-kufi-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  declarations: [{ prop: 'font-family', value: 'Noto Kufi Arabic' }],
  variable: '--font-display', display: 'swap', preload: true, adjustFontFallback: 'Arial',
});
const displayMediumFont = localFont({
  src: [{ path: './fonts/noto-kufi-arabic-600.woff2', weight: '600', style: 'normal' }],
  declarations: [{ prop: 'font-family', value: 'Noto Kufi Arabic' }],
  variable: '--font-display-medium', display: 'swap', preload: false, adjustFontFallback: 'Arial',
});
export const displayFontVariable = displayFont.variable + ' ' + displayMediumFont.variable;
export const plexFont = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-sans-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  declarations: [{ prop: 'font-family', value: 'IBM Plex Sans Arabic' }],
  variable: '--font-plex', display: 'swap', adjustFontFallback: 'Arial', preload: true,
});
const plexMediumFont = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-arabic-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ibm-plex-sans-arabic-600.woff2', weight: '600', style: 'normal' },
  ],
  declarations: [{ prop: 'font-family', value: 'IBM Plex Sans Arabic' }],
  variable: '--font-plex-medium', display: 'swap', adjustFontFallback: 'Arial', preload: false,
});
export const readexFont = localFont({
  src: [{ path: './fonts/readex-pro-variable.woff2', weight: '160 700', style: 'normal' }],
  declarations: [{ prop: 'font-family', value: 'Readex Pro' }],
  variable: '--font-readex', display: 'swap', adjustFontFallback: 'Arial', preload: false,
});
export const bodyFontVariable = BODY_FONT === 'plex' ? plexFont.variable + ' ' + plexMediumFont.variable : readexFont.variable;
