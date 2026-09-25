'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { isNavigationActive } from '@/lib/navigation';
import styles from './header-nav.module.css';
import { NavigationIcon, type NavigationIconName } from './navigation-icon';

const items: { href: string; label: string; description: string; icon: NavigationIconName }[] = [
  { href: '/', label: 'الرئيسية', description: 'أهلًا بيك وسط أهلك', icon: 'home' },
  { href: '/directory', label: 'الخدمات', description: 'شوف طلبك فين', icon: 'services' },
  { href: '/villages', label: 'القرى والنجوع', description: 'شوف بلدك واللي حواليها', icon: 'villages' },
  { href: '/news', label: 'الأخبار', description: 'اعرف إيه الجديد في البلد', icon: 'news' },
  { href: '/jobs', label: 'الوظائف', description: 'شغل من نقادة وقراها', icon: 'jobs' },
  { href: '/knowledge', label: 'الموسوعة', description: 'اعرف بلدك زين', icon: 'knowledge' },
  { href: '/blog', label: 'الحكايات', description: 'حكاوي بلدنا وناسها', icon: 'stories' },
  { href: '/role-models', label: 'نماذج مشرفة', description: 'ناس من بلدنا ترفع الراس', icon: 'people' },
];

export function HeaderNav() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
    }
    function closeOutside(event: PointerEvent) {
      if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false;
    }
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, []);
  return (
    <>
      <nav className={styles.nav} aria-label="التنقل الرئيسي">
        {items.map((item) => <Link key={item.href} href={item.href} prefetch={false} aria-current={isNavigationActive(pathname, item.href) ? 'page' : undefined}><NavigationIcon name={item.icon} /><span>{item.label}</span></Link>)}
      </nav>
      <details ref={menu} key={pathname} className={styles.menu}>
        <summary aria-label="قائمة أقسام دليل نقادة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg><span>القائمة</span></summary>
        <div className={styles.panel}>
          <div className={styles.panelHead}><span>لفّة في بلدنا</span><strong>رايح فين؟ نوصّلك.</strong></div>
          <nav aria-label="كل أقسام الدليل">
            {items.map((item) => <Link key={item.href} href={item.href} prefetch={false} aria-current={isNavigationActive(pathname, item.href) ? 'page' : undefined} onClick={() => { if (menu.current) menu.current.open = false; }}><span className={styles.menuIcon}><NavigationIcon name={item.icon} /></span><div><strong>{item.label}</strong><small>{item.description}</small></div><b aria-hidden="true">←</b></Link>)}
          </nav>
          <div className={styles.utilities}><Link href="/emergency" prefetch={false}>أرقام مهمة</Link><Link href="/contribute" prefetch={false}>أضف معلومة</Link><Link href="/about" prefetch={false}>عن الدليل</Link></div>
        </div>
      </details>
    </>
  );
}
