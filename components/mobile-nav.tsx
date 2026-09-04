'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavIconName = 'home' | 'search' | 'blog' | 'villages' | 'families';

const items: { href: string; label: string; icon: NavIconName }[] = [
  { href: '/', label: 'الرئيسية', icon: 'home' },
  { href: '/directory', label: 'الدليل', icon: 'search' },
  { href: '/blog', label: 'المدونة', icon: 'blog' },
  { href: '/villages', label: 'القرى', icon: 'villages' },
  { href: '/families', label: 'العائلات', icon: 'families' },
];

function NavIcon({ name }: { name: NavIconName }) {
  const paths = {
    home: <><path d="m4 10 8-6 8 6"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-6h4v6"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.25"/><path d="m15.2 15.2 4.3 4.3"/><path d="M8 10.5h5M10.5 8v5"/></>,
    blog: <><path d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v12H8.5A2.5 2.5 0 0 1 6 16.5v-12Z"/><path d="M6 16.5A2.5 2.5 0 0 1 8.5 14H18M9 8h6M9 11h4"/></>,
    villages: <><path d="M3.5 20h17"/><path d="M5 20v-8l4-3 4 3v8M13 20v-11l3-2.5L19 9v11"/><path d="M8 15h2M15.5 12h1"/></>,
    families: <><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.3"/><path d="M3.5 20v-2.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V20"/><path d="M14 14.2a4 4 0 0 1 6.5 3.1V20"/></>,
  };
  return (
    <span className="mobile-nav__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    </span>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav" aria-label="التنقل على الجوال">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
            <NavIcon name={item.icon} />
            <span className="mobile-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
