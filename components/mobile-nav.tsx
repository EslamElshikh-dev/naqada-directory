'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavIconName = 'home' | 'search' | 'add' | 'landmarks' | 'account';

const items: { href: string; label: string; icon: NavIconName; featured?: boolean }[] = [
  { href: '/', label: 'الرئيسية', icon: 'home' },
  { href: '/directory', label: 'الدليل', icon: 'search' },
  { href: '/contribute', label: 'أضف نشاطًا', icon: 'add', featured: true },
  { href: '/landmarks', label: 'المعالم', icon: 'landmarks' },
  { href: '/account', label: 'حسابي', icon: 'account' },
];

function NavIcon({ name }: { name: NavIconName }) {
  const paths = {
    home: <><path d="m4 10 8-6 8 6"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-6h4v6"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.25"/><path d="m15.2 15.2 4.3 4.3"/><path d="M8 10.5h5M10.5 8v5"/></>,
    add: <><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></>,
    landmarks: <><path d="m3 9 9-5 9 5H3Z"/><path d="M5 20h14M6.5 9v8M10.2 9v8M13.8 9v8M17.5 9v8"/></>,
    account: <><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20v-1.7a5.8 5.8 0 0 1 5.8-5.8h1.4a5.8 5.8 0 0 1 5.8 5.8V20"/><path d="M4 20h16"/></>,
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
          <Link key={item.href} href={item.href} className={item.featured ? 'mobile-nav__featured' : undefined} aria-current={active ? 'page' : undefined}>
            <NavIcon name={item.icon} />
            <span className="mobile-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
