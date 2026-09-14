'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/directory', label: 'الخدمات' },
  { href: '/villages', label: 'الأماكن' },
  { href: '/knowledge', label: 'الموسوعة' },
];

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="desktop-nav" aria-label="التنقل الرئيسي">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
      })}
    </nav>
  );
}
