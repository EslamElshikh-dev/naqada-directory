import Link from 'next/link';
import '../dashboard-rework.css';
import styles from './admin-nav.module.css';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <nav className={styles.bar} aria-label="مساحة إدارة دليل نقادة">
        <Link href="/admin"><b>ADMIN</b> لوحة الإدارة</Link>
        <Link href="/admin/growth"><b>V17</b> أولويات النمو</Link>
        <Link href="/admin/contributions"><b>V22</b> مراجعة المساهمات</Link>
      </nav>
      {children}
    </>
  );
}
