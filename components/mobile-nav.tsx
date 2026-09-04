'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'الرئيسية', icon: '⌂' },
  { href: '/directory', label: 'الدليل', icon: '⌕' },
  { href: '/blog', label: 'المدونة', icon: '✦' },
  { href: '/villages', label: 'القرى', icon: '⌖' },
  { href: '/families', label: 'العائلات', icon: 'ع' },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="التنقل على الجوال">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}><b aria-hidden="true">{item.icon}</b><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
