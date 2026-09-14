'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './mobile-nav.module.css';

type NavIconName = 'home' | 'search' | 'places' | 'knowledge';

const items: { href: string; label: string; icon: NavIconName }[] = [
  { href: '/', label: 'الرئيسية', icon: 'home' },
  { href: '/directory', label: 'الخدمات', icon: 'search' },
  { href: '/villages', label: 'الأماكن', icon: 'places' },
  { href: '/knowledge', label: 'الموسوعة', icon: 'knowledge' },
];

function NavIcon({ name }: { name: NavIconName }) {
  const paths = {
    home: <><path d="m4 10 8-6 8 6"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-6h4v6"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.25"/><path d="m15.2 15.2 4.3 4.3"/><path d="M8 10.5h5M10.5 8v5"/></>,
    places: <><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></>,
    knowledge: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z"/></>,
  };
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    </span>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="التنقل على الجوال">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
            <NavIcon name={item.icon} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
