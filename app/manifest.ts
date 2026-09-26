import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'دليل نقادة',
    short_name: 'دليل نقادة',
    description: 'الدليل والموسوعة المحلية لمركز نقادة بمحافظة قنا.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6efe6',
    theme_color: '#102a24',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/app-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
