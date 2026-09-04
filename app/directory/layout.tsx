import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'دليل الخدمات والأنشطة في نقادة',
  description: 'ابحث وصَفِّ الأنشطة والخدمات المنشورة في مدينة نقادة وقراها ونجوعها بحسب الاسم والتصنيف والمكان.',
  path: '/directory',
});

export default function DirectoryLayout({ children }: { children: ReactNode }) {
  return children;
}
