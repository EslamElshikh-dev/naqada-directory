import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'أرقام الطوارئ والخدمات المهمة',
  description: 'أرقام الإسعاف والنجدة والمطافئ والكهرباء والمياه والغاز والخدمات المهمة للاستخدام السريع داخل نقادة.',
  path: '/emergency',
});

export default function EmergencyLayout({ children }: { children: ReactNode }) {
  return children;
}
