import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'أعلام ومعالم نقادة',
  description: 'سجل موثق للأعلام والمعالم والتراث المحلي في مركز نقادة مع المصادر ودرجات الدليل وحدود كل معلومة.',
  path: '/heritage',
});

export default function HeritageLayout({ children }: { children: ReactNode }) {
  return children;
}
