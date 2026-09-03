import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://naqada-directory.vercel.app',
  },
};

export default nextConfig;
