import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { resolveSession } from '@/lib/auth/session';
import { canModerate } from '@/lib/auth/moderator';
import { getContributionQueue, getRecentRequests } from '@/lib/contribution-review';
import { RecentRequests } from '../recent-requests';
import { getEffectiveBusiness } from '@/lib/curated-content';
import { categories, localities } from '@/lib/data';
import { PendingContributions } from './pending-contributions';
import { AdminLiveRefresh } from '../admin-live-refresh';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { ownerListingSelect, type OwnerListing } from '@/lib/owner-listings';
import { PendingActivities } from './pending-activities';
import styles from './pending-activities.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مراجعة أنشطة الأعضاء', robots: { index: false, follow: false } };

export default async function ActivitiesModerationPage() {
  const session = await resolveSession(false);
  if (!session || !(await canModerate(session.accessToken))) redirect('/account');
  const [response, contributions, recentRequests] = await Promise.all([fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?status=eq.pending&select=${ownerListingSelect}&order=created_at.desc&limit=100`,
    { headers: restHeaders(session.accessToken), cache: 'no-store' },
  ), getContributionQueue(session.accessToken).catch(() => null), getRecentRequests(session.accessToken).catch(() => null)]);
  const items = await Promise.all((contributions || []).map(async (item) => {
    const existing = item.listingSlug ? await getEffectiveBusiness(item.listingSlug) : null;
    return { ...item, payload: {
      title: existing?.name || item.name, category: existing?.category || item.category || '',
      locality: existing?.locality || item.locality || '',
      phone: existing?.phone || '', address: existing?.address || '',
      sourceUrl: item.sourceUrl || '',
      summary: existing?.description || (existing ? `${existing.name} في ${existing.locality || 'مركز نقادة'}.` : item.details || ''),
    } };
  }));
  const listings = response.ok ? await response.json() as OwnerListing[] : [];
  return <main id="main-content" className={`shell ${styles.page}`}>
    <span className="eyebrow eyebrow--dark">أنشطة من أهل البلد</span>
    <h1>طلبات الأنشطة والإضافة والتصحيح</h1><AdminLiveRefresh />
    <p>افحص الاسم والرقم والعنوان والوصف والصور، ثم انشر النشاط أو ارجعه لصاحبه للتعديل. الصفحة العامة والدليل يظهروا بعد اعتمادك بس.</p>
    <RecentRequests items={recentRequests} />
    {!response.ok ? <p role="alert">تعذر تحميل طلبات المراجعة. حدّث الصفحة وحاول تاني.</p> : <PendingActivities key={listings.map((item) => `${item.id}:${item.updated_at}`).join()} initial={listings} />}
    {contributions === null ? <p role="alert">تعذر تحميل طلبات الإضافة والتصحيح. حاول التحديث.</p> : <PendingContributions items={items} categories={categories.map((item) => item.name)} localities={localities.map((item) => item.name)} />}
  </main>;
}
