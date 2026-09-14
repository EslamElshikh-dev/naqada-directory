import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { emptyContributionQueue, getContributionQueue } from '@/lib/auth/contribution-operations';
import { resolveSession } from '@/lib/auth/session';
import { enrichContributionQueue } from '@/lib/contribution-review';
import { ContributionReviewQueue } from './contribution-review-queue';
import styles from './contributions.module.css';

export const metadata: Metadata = {
  title: 'مراجعة مساهمات دليل نقادة',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ContributionOperationsPage() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');

  const snapshot = await getContributionQueue(session.accessToken).catch(() => emptyContributionQueue);
  const items = enrichContributionQueue(snapshot);

  return (
    <main id="main-content" className="admin-page admin-page--premium">
      <div className="shell admin-shell admin-shell--premium">
        <section className={styles.hero}>
          <span>Contribution Review Operations V22</span>
          <h1>من مساهمة الزائر إلى قرار مراجعة قابل للتنفيذ</h1>
          <p>
            طابور واحد يجمع الأولوية، المصدر، المطابقة المحتملة مع السجلات المنشورة، التكرار، وحالة التحقق.
            الاعتماد لا يغيّر بيانات الدليل تلقائيًا؛ وبعد تنفيذ التعديل فعليًا يُغلق الطلب بحالة «تم تحديث الدليل».
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
            <Link href="/admin/growth" className="text-link">أولويات النمو V17 ←</Link>
            <Link href="/contribute" className="text-link">نموذج المساهمة العام ←</Link>
            <Link href="/directory" className="text-link">الدليل المنشور ←</Link>
          </div>
        </section>

        <ContributionReviewQueue items={items} summary={snapshot.summary} />
      </div>
    </main>
  );
}
