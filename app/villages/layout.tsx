import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'قرى ونجوع مركز نقادة',
  description: 'استكشف القرى والنجوع والعزب والمواضع الموثقة داخل مركز نقادة وافتح صفحة مستقلة للخدمات المسجلة في كل موضع.',
  path: '/villages',
});

export default function VillagesLayout({ children }: { children: ReactNode }) {
  return children;
}
