import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  async headers() {
    return [{
      // The generator versions this path from the photograph and encoding settings.
      source: '/images/home-hero/:version/:file',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    }];
  },
  experimental: {
    globalNotFound: true,
    // Ephemeral QA filesystems can opt out without changing the hosted build default.
    turbopackFileSystemCacheForBuild: process.env.NAQADA_DISABLE_BUILD_CACHE !== '1',
    // Share styles by route instead of pulling unrelated component styles into large common chunks.
    cssChunking: process.env.ANALYZE === 'true' ? true : { type: 'graph', requestCost: 1000 },
  },
  async rewrites() {
    return { beforeFiles: [
      ...['q','category','locality','sort','page'].map(key => ({ source: '/directory/', has: [{ type: 'query' as const, key }], destination: '/directory-query/' })),
      { source: '/news/', has: [{ type: 'query' as const, key: 'section' }], destination: '/news-query/' },
      ...['q','view'].map(key => ({ source: '/jobs/', has: [{ type: 'query' as const, key }], destination: '/jobs-query/' })),
    ], afterFiles: [], fallback: [] };
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.elaosboa.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'asc-mek.org', pathname: '/storage/Foundation_Graduate_Images/**' },
      { protocol: 'https', hostname: 'www.bing.com', pathname: '/th*' },
      { protocol: 'https', hostname: 'img.youm7.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.youm7.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media.elwatannews.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.elwatannews.com', pathname: '/**' },
      { protocol: 'https', hostname: 'mediaaws.almasryalyoum.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.almasryalyoum.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media.gemini.media', pathname: '/**' },
      { protocol: 'https', hostname: 'www.masrawy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.akhbarelyom.com', pathname: '/**' },
      { protocol: 'https', hostname: 'akhbarelyom.com', pathname: '/**' },
      { protocol: 'https', hostname: 'gate.ahram.org.eg', pathname: '/**' },
      { protocol: 'https', hostname: 'www.cairo24.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.elbalad.news', pathname: '/**' },
      { protocol: 'https', hostname: 'elbalad.news', pathname: '/**' },
      { protocol: 'https', hostname: 'www.qena.gov.eg', pathname: '/**' },
      { protocol: 'https', hostname: 'qena.gov.eg', pathname: '/**' },
    ],
  },
};

export default bundleAnalyzer({ enabled: process.env.ANALYZE === 'true', openAnalyzer: false })(nextConfig);
