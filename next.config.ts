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
    ],
  },
};

export default nextConfig;
