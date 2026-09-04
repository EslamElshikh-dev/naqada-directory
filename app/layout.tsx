import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Footer, SiteHeader } from '@/components/site-shell';
import { siteConfig } from '@/lib/site';
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
  keywords: ['نقادة', 'مركز نقادة', 'دليل نقادة', 'قرى نقادة', 'قنا', 'خدمات نقادة', 'عائلات نقادة', 'معالم نقادة'],
  alternates: { canonical: '/' },
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
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/directory?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  const analyticsBootstrap = `
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.va('beforeSend', function (event) {
      try {
        var url = new URL(event.url);
        url.searchParams.delete('q');
        return Object.assign({}, event, { url: url.toString() });
      } catch (error) {
        return event;
      }
    });
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  `;
  return (
    <html lang="ar" dir="rtl" className={notoKufi.variable}>
      <body>
        <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
        <SiteHeader />
        {children}
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <script dangerouslySetInnerHTML={{ __html: analyticsBootstrap }} />
        <script defer src="/_vercel/insights/script.js" />
        <script defer src="/_vercel/speed-insights/script.js" />
      </body>
    </html>
  );
}
