'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './header-nav.module.css';

const items = [
  { href: '/directory', label: 'الخدمات', icon: 'directory' },
  { href: '/villages', label: 'الأماكن', icon: 'places' },
  { href: '/news', label: 'الأخبار', icon: 'news' },
  { href: '/knowledge', label: 'الموسوعة', icon: 'knowledge' },
] as const;

type NavIconName = (typeof items)[number]['icon'];

function NavIcon({ name }: { name: NavIconName }) {
  const paths = {
    directory: <><path d="M4 5.5h16v13H4z"/><path d="M7.5 9h9M7.5 12h6M7.5 15h4"/></>,
    places: <><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></>,
    news: <><path d="M5 4h13a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5"/><path d="M5 7H3.5v10.5A2.5 2.5 0 0 0 6 20"/></>,
    knowledge: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z"/></>,
  };

  return (
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    </span>
  );
}

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="التنقل الرئيسي">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
