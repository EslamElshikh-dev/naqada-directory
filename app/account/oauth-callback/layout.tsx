import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'استكمال تسجيل الدخول',
  robots: { index: false, follow: false },
};

export default function OAuthCallbackLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
