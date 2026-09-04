import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Footer, SiteHeader } from '@/components/site-shell';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import './globals.css';

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
  },
  twitter: { card: 'summary', title: siteConfig.name, description: siteConfig.description },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#102a24',
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
