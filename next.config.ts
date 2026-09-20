import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.elaosboa.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'asc-mek.org', pathname: '/storage/Foundation_Graduate_Images/**' },
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
      { protocol: 'https', hostname: 'www.qena.gov.eg', pathname: '/**' },
      { protocol: 'https', hostname: 'qena.gov.eg', pathname: '/**' },
    ],
  },
};

export default nextConfig;
