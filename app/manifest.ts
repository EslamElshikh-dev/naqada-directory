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
    categories: ['utilities', 'navigation', 'education'],
    shortcuts: [
      { name: 'الخدمات', url: '/directory/', icons: [{ src: '/app-icons/icon-192.png', sizes: '192x192' }] },
      { name: 'القرى والنجوع', url: '/villages/' },
      { name: 'الأرقام المهمة', url: '/emergency/' },
      { name: 'اسأل سند', url: '/#sanad' },
    ],
    screenshots: [
      { src: '/app-icons/screenshot-mobile.jpg', sizes: '390x900', type: 'image/jpeg', form_factor: 'narrow', label: 'الصفحة الرئيسية على الجوال' },
      { src: '/app-icons/screenshot-desktop.jpg', sizes: '1440x900', type: 'image/jpeg', form_factor: 'wide', label: 'الصفحة الرئيسية على الحاسوب' },
    ],
    icons: [
      { src: '/app-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
