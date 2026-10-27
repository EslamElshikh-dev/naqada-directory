import '@/app/content-styles.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canModerate, getEditorContent, getModeratorDashboard } from '@/lib/auth/moderator';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { resolveSession } from '@/lib/auth/session';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { getOpenSearchGaps } from '@/lib/growth-priority';
import { ModeratorWorkspace } from './workspace';
import styles from './workspace.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مساحة الإشراف | دليل نقادة', robots: { index: false, follow: false } };

export default async function ModeratorPage() {
  const session = await resolveSession(false);
  if (!session || !(await canModerate(session.accessToken))) redirect('/account');
  const [rawDashboard, content, isAdmin, catalog] = await Promise.all([
    getModeratorDashboard(session.accessToken),
    getEditorContent(session.accessToken),
    isDirectoryAdmin(session.accessToken),
    getPublicBusinessCatalog().catch(() => null),
  ]);
  const dashboard = { ...rawDashboard, missedSearches: getOpenSearchGaps(rawDashboard.missedSearches, catalog?.businesses) };
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}><span>ن</span><b>دليل نقادة</b><small>مساحة الإشراف</small></Link>
          <div className={styles.toplinks}><Link href="/account">حسابي</Link>{isAdmin ? <Link href="/admin">لوحة المالك</Link> : null}<Link href="/">عرض الموقع ↗</Link></div>
        </header>
        <ModeratorWorkspace initialDashboard={dashboard} initialContent={content} name={dashboard.viewer?.name || session.user.displayName} avatarUrl={dashboard.viewer?.avatarUrl || session.user.avatarUrl} />
      </div>
    </main>
  );
}
