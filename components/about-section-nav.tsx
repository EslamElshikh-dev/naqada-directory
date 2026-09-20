import Link from 'next/link';
import styles from './about-section-nav.module.css';

type AboutSection = 'directory' | 'developer';

const items = [
  { key: 'directory', href: '/about', label: 'عن الدليل', meta: 'المشروع' },
  { key: 'developer', href: '/about/developer', label: 'عن المطوّر', meta: 'إسلام الشيخ' },
] as const;

export function AboutSectionNav({ current }: { current: AboutSection }) {
  return (
    <nav className={styles.nav} aria-label="عن دليل نقادة">
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span>{item.label}</span>
            <small>{item.meta}</small>
          </Link>
        );
      })}
    </nav>
  );
}
