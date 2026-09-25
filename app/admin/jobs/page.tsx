import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { resolveSession } from '@/lib/auth/session';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { PendingJobs } from './pending-jobs';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مراجعة وظائف نقادة', robots: { index: false, follow: false } };

export type PendingJob = {
  id: string; kind: 'offer' | 'seeker'; title: string; organization: string | null; locality: string;
  field: string; description: string; experience: string | null; contact_kind: string;
  contact_value: string; contact_consent: boolean; created_at: string;
};

export default async function JobsModerationPage() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_pending_naqada_jobs`, { method: 'POST', headers: restHeaders(session.accessToken, true), body: '{}', cache: 'no-store' });
  const jobs = response.ok ? await response.json() as PendingJob[] : [];
  return <main id="main-content" className="shell" style={{ paddingBlock: '56px 100px', minHeight: '70vh' }}><span className="eyebrow eyebrow--dark">مراجعة المحتوى المحلي</span><h1>طلبات الوظائف والخبرات</h1><p>راجع المكان والوصف وبيانات التواصل، ثم انشر الطلب أو ارفضه. الإعلان المنشور يظهر لمدة ٣٠ يومًا.</p>{!response.ok ? <p role="alert">تعذر تحميل الطلبات حاليًا. حدّث الصفحة للمحاولة مرة أخرى.</p> : <PendingJobs initial={jobs} />}</main>;
}
