import Link from 'next/link';
import '../dashboard-rework.css';
import styles from './admin-nav.module.css';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <nav className={styles.bar} aria-label="مساحة إدارة دليل نقادة">
        <Link href="/admin"><b aria-hidden="true">◫</b><span>لوحة الإدارة</span></Link>
        <Link href="/admin/growth"><b aria-hidden="true">↗</b><span>أولويات النمو</span></Link>
        <Link href="/admin/jobs"><b aria-hidden="true">▣</b><span>مراجعة الوظائف</span></Link>
        <Link href="/admin/activities"><b aria-hidden="true">▦</b><span>مراجعة الأنشطة</span></Link>
        <Link href="/admin#moderator-performance"><b aria-hidden="true">✦</b><span>أداء آية</span></Link>
        <Link href="/moderator"><b aria-hidden="true">✎</b><span>المحتوى والأعضاء</span></Link>
      </nav>
      {children}
    </>
  );
}
