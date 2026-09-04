import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'سجل عائلات نقادة الموثق',
  description: 'العائلة والموضع ودرجة الدليل وحدود كل ادعاء في السجل العائلي المنشور لمركز نقادة، دون وصل أنساب بالتشابه الاسمي.',
  path: '/families',
});

export default function FamiliesLayout({ children }: { children: ReactNode }) {
  return children;
}
