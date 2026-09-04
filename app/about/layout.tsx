import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'عن دليل نقادة ومنهج البيانات',
  description: 'تعرف على نطاق دليل نقادة، درجات التوثيق، قواعد نشر بيانات الخدمات والعائلات والتراث، وطريقة اقتراح التصحيحات.',
  path: '/about',
});

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
