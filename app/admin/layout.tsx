import Link from 'next/link';
import '../dashboard-rework.css';
import styles from './admin-nav.module.css';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <nav className={styles.bar} aria-label="مساحة إدارة دليل نقادة">
        <Link href="/admin"><b>ADMIN</b> لوحة الإدارة</Link>
        <Link href="/admin/growth"><b>V17</b> أولويات النمو</Link>
        <Link href="/admin/jobs"><b>شغل</b> مراجعة الوظائف</Link>
        <Link href="/admin/activities"><b>نشاط</b> مراجعة الأنشطة</Link>
      </nav>
      {children}
    </>
  );
}
