import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { BODY_FONT, bodyFontVariable, displayFont } from '@/app/fonts';
import { SiteHeader } from '@/components/site-shell';
import { Footer } from '@/components/site-footer';
import { MobileNav } from '@/components/mobile-nav';
import { absoluteUrl, jsonLdStringify, siteConfig } from '@/lib/site';
import { VisitorTracker } from '@/components/visitor-tracker';
import { SanadAssistant } from '@/components/sanad-assistant';
import { UpdatesTicker } from '@/components/updates-ticker';
import { PwaSetup } from '@/components/pwa-setup';
import { MetaPixel } from '@/components/meta-pixel';
import './shell-styles.css';
import './widget-triggers.css';


export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: '%s | دليل نقادة' },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  appleWebApp: { capable: true, title: 'دليل نقادة', statusBarStyle: 'default' },
  verification: {
    google: 'a5AfDDI67VsUYxqSvx00gPy5bqSb1V9YoZ1DX8-GkxY',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/app-icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: { canonical: '/' },
  robots: {
    googleBot: {
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: absoluteUrl('/'),
    title: 'دليل نقادة | بلدنا كلها في مكان واحد',
    description: 'خدمات نقادة وقراها، الأماكن والوظائف وحكايات ناسها في دليل واحد. قول عاوز إيه.. وهنوصّلك، من أهل البلد لأهل البلد.',
    siteName: siteConfig.shortName,
    images: [{
      url: siteConfig.socialImage,
      width: 1200,
      height: 630,
      alt: 'دليل نقادة، من أهل البلد لأهل البلد: الخدمات والقرى والنجوع وحكايات أهل نقادة',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'دليل نقادة | بلدنا كلها في مكان واحد',
    description: 'خدمات نقادة وقراها، الأماكن والوظائف وحكايات ناسها في مكان واحد. قول عاوز إيه.. وهنوصّلك.',
    images: [siteConfig.socialImage],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#102a24',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const homeUrl = absoluteUrl('/');
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${homeUrl}#website`,
        name: siteConfig.shortName,
        alternateName: siteConfig.alternateNames,
        url: homeUrl,
        inLanguage: 'ar-EG',
        description: siteConfig.description,
        publisher: { '@id': `${homeUrl}#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${homeUrl}#organization`,
        name: siteConfig.shortName,
        alternateName: ['الموسوعة المحلية لمركز نقادة', ...siteConfig.alternateNames],
        url: homeUrl,
        logo: { '@type': 'ImageObject', url: siteConfig.logoImage, width: 192, height: 192 },
        contactPoint: { '@type': 'ContactPoint', contactType: 'تصحيح بيانات الدليل', url: absoluteUrl('/contribute'), availableLanguage: 'ar' },
        areaServed: { '@type': 'AdministrativeArea', name: 'مركز نقادة، محافظة قنا، مصر' },
      },
    ],
  };

  return (
    <html lang="ar-EG" dir="rtl" data-body-font={BODY_FONT} className={displayFont.variable + ' ' + bodyFontVariable}>
      <head><link rel="preconnect" href="https://ceyjfguoomdlrtsujskj.supabase.co" crossOrigin="anonymous" /></head>
      <body className="mobile-editorial encyclopedia-ui">
        <noscript dangerouslySetInnerHTML={{ __html: '<link rel="stylesheet" href="/styles/widgets/cards.css">' }} />
        <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
        <SiteHeader />
        <UpdatesTicker />
        <VisitorTracker />
        <PwaSetup />
        <Suspense fallback={null}><MetaPixel /></Suspense>

        {children}
        <Footer />
        <MobileNav />
        <SanadAssistant />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(websiteSchema) }} />
        {process.env.VERCEL === '1' && <><script defer src="/scripts/speed-insights-bootstrap.js" /><script defer src="/_vercel/speed-insights/script.js" /></>}
      </body>
    </html>
  );
}
