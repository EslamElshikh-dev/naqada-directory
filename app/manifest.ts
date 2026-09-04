import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'دليل نقادة',
    short_name: 'دليل نقادة',
    description: 'الدليل والموسوعة المحلية لمركز نقادة بمحافظة قنا.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6efe6',
    theme_color: '#2d1e18',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
