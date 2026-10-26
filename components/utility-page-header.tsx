import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './utility-page-header.module.css';

type Props = {
  current: string;
  eyebrow?: string;
  title: ReactNode;
  description: string;
  metrics?: Array<{ value: string; label: string }>;
  parent?: { href: string; label: string };
};

export function UtilityPageHeader({ current, eyebrow, title, description, metrics = [], parent }: Props) {
  return <section className={styles.hero}>
    <div className="shell">
      <nav className={styles.breadcrumbs} aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span>{parent ? <><Link href={parent.href}>{parent.label}</Link><span aria-hidden="true">/</span></> : null}<span aria-current="page">{current}</span></nav>
      <div className={styles.row}>
        <div className={styles.copy}>
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
          <h1>{title}</h1><p>{description}</p>
        </div>
        {metrics.length ? <dl className={styles.metrics}>{metrics.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}
      </div>
    </div>
  </section>;
}
