import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveSession } from '@/lib/auth/session';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import styles from './contributions.module.css';

export const metadata: Metadata = { title: 'حالة مساهماتي', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type OwnContribution = {
  id: string;
  request_type: 'add' | 'correction' | 'missing';
  name: string;
  status: 'pending' | 'reviewing' | 'needs_info' | 'approved' | 'rejected' | 'published';
  review_message: string | null;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<OwnContribution['status'], string> = {
  pending: 'تم الاستلام',
  reviewing: 'قيد المراجعة',
  needs_info: 'مطلوب معلومات إضافية',
  approved: 'تم الاعتماد',
  rejected: 'لم يتم الاعتماد',
  published: 'تم تحديث الدليل',
};

const typeLabels = { add: 'إضافة نشاط', correction: 'تصحيح بيانات', missing: 'نتيجة بحث مفقودة' } as const;

function date(value: string) {
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value));
}

async function readOwnContributions(accessToken: string, userId: string) {
  const params = new URLSearchParams({
    submitted_by_user_id: `eq.${userId}`,
    select: 'id,request_type,name,status,review_message,created_at,updated_at',
    order: 'created_at.desc',
    limit: '50',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/directory_contributions?${params.toString()}`, {
    headers: restHeaders(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) return [];
  return response.json() as Promise<OwnContribution[]>;
}

export default async function MyContributionsPage() {
  const session = await resolveSession(false);
  if (!session) redirect('/account/login');
  const contributions = await readOwnContributions(session.accessToken, session.user.id);

  return (
    <main id="main-content" className={styles.page}>
      <div className="shell">
        <section className={styles.hero}>
          <div><span>متابعة المساهمات</span><h1>حالة طلباتك في دليل نقادة</h1><p>هنا تظهر مراحل المراجعة والرسائل الموجهة لك فقط. ملاحظات الإدارة الداخلية لا تظهر في حسابك.</p></div>
          <Link href="/contribute">إضافة أو تصحيح جديد ←</Link>
        </section>

        {contributions.length ? <div className={styles.list}>{contributions.map((item) => (
          <article className={styles.card} key={item.id}>
            <div className={styles.top}>
              <div><small>{typeLabels[item.request_type]} · أُرسل {date(item.created_at)}</small><h2>{item.name}</h2></div>
              <span className={styles.badge} data-status={item.status}>{statusLabels[item.status]}</span>
            </div>
            {item.review_message ? <div className={styles.message}><b>رسالة المراجعة</b>{item.review_message}</div> : null}
            <div className={styles.actions}>
              {item.status === 'needs_info' ? <Link href={`/contribute?type=correction&name=${encodeURIComponent(item.name)}`}>إرسال المعلومات المطلوبة</Link> : null}
              <Link href="/account">العودة إلى حسابي</Link>
            </div>
          </article>
        ))}</div> : <div className={styles.empty}>لا توجد مساهمات مرتبطة بهذا الحساب حتى الآن.<br/><Link href="/contribute" className="text-link">ابدأ بإضافة نشاط أو تصحيح معلومة ←</Link></div>}
      </div>
    </main>
  );
}
