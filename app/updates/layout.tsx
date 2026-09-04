import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'آخر تحديثات دليل نقادة',
  description: 'تابع أحدث سجلات الأنشطة والخدمات التي تمت مراجعتها داخل دليل نقادة، مع تاريخ المراجعة وروابط الوصول والتفاصيل.',
  path: '/updates',
});

export default function UpdatesLayout({ children }: { children: ReactNode }) {
  return children;
}
