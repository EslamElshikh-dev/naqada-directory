import localFont from 'next/font/local';
import { IBM_Plex_Sans_Arabic, Readex_Pro } from 'next/font/google';

export const BODY_FONT: 'plex' | 'readex' = 'plex';
export const displayFont = localFont({
  src: [
    { path: './fonts/noto-kufi-arabic-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/noto-kufi-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  declarations: [{ prop: 'font-family', value: 'Noto Kufi Arabic' }],
  variable: '--font-display', display: 'swap', preload: false, adjustFontFallback: 'Arial',
});
export const plexFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'],
  variable: '--font-plex', display: 'swap', adjustFontFallback: true, preload: false,
});
export const readexFont = Readex_Pro({
  subsets: ['arabic', 'latin'], weight: 'variable', variable: '--font-readex',
  display: 'swap', adjustFontFallback: true, preload: false,
});
export const bodyFontVariable = BODY_FONT === 'plex' ? plexFont.variable : readexFont.variable;
