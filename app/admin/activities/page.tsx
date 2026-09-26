import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { resolveSession } from '@/lib/auth/session';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { ownerListingSelect, type OwnerListing } from '@/lib/owner-listings';
import { PendingActivities } from './pending-activities';
import styles from './pending-activities.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مراجعة أنشطة الأعضاء', robots: { index: false, follow: false } };

export default async function ActivitiesModerationPage() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?status=eq.pending&select=${ownerListingSelect}&order=created_at.asc&limit=100`,
    { headers: restHeaders(session.accessToken), cache: 'no-store' },
  );
  const listings = response.ok ? await response.json() as OwnerListing[] : [];
  return <main id="main-content" className={`shell ${styles.page}`}>
    <span className="eyebrow eyebrow--dark">أنشطة من أهل البلد</span>
    <h1>مراجعة أنشطة الأعضاء</h1>
    <p>افحص الاسم والرقم والعنوان والوصف والصور، ثم انشر النشاط أو ارجعه لصاحبه للتعديل. الصفحة العامة والدليل يظهروا بعد اعتمادك بس.</p>
    {!response.ok ? <p role="alert">تعذر تحميل طلبات المراجعة. حدّث الصفحة وحاول تاني.</p> : <PendingActivities initial={listings} />}
  </main>;
}
