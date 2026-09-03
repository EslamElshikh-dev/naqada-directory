import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'دليل نقادة',
    short_name: 'دليل نقادة',
    description: 'الدليل والموسوعة المحلية لمركز نقادة بمحافظة قنا.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f4ed',
    theme_color: '#102a24',
    lang: 'ar',
    dir: 'rtl',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
