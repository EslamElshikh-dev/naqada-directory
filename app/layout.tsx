import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Footer, SiteHeader } from '@/components/site-shell';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import './globals.css';
import './naqada-theme.css';
import './member-system.css';
import './premium-refresh.css';
import './experience-polish.css';
import './design-rework.css';

const notoKufi = localFont({
  src: './fonts/noto-kufi-arabic.woff2',
  display: 'swap',
  variable: '--font-arabic',
  weight: '100 900',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: '%s | دليل نقادة' },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  verification: {
    google: 'a5AfDDI67VsUYxqSvx00gPy5bqSb1V9YoZ1DX8-GkxY',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/pwa-icon-192', sizes: '192x192', type: 'image/png' }],
  },
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.shortName,
    images: [{
      url: siteConfig.socialImage,
      width: 1200,
      height: 630,
      alt: 'دليل نقادة — الموسوعة المحلية لمركز نقادة',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.socialImage],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2d1e18',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}#website`,
    name: siteConfig.shortName,
    alternateName: siteConfig.name,
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    description: siteConfig.description,
  };
  const speedInsightsBootstrap = `window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };`;
  return (
    <html lang="ar-EG" dir="rtl" className={notoKufi.variable}>
      <body>
        <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
        <SiteHeader />
        {children}
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(websiteSchema) }} />
        <script dangerouslySetInnerHTML={{ __html: speedInsightsBootstrap }} />
        <script defer src="/_vercel/speed-insights/script.js" />
      </body>
    </html>
  );
}
