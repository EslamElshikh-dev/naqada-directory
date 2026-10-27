import '@/app/route-styles/admin-data-quality.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveSession } from '@/lib/auth/session';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { businessCompleteness } from '@/lib/data-quality';
import { publicBusinessHref } from '@/lib/business-links';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'اكتمال بيانات الأنشطة', robots: { index: false, follow: false } };
export default async function DataQuality() {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');
  const catalog = await getPublicBusinessCatalog();
  const rows = catalog.businesses.map(businessCompleteness).sort((a,b) => a.score - b.score || a.item.name.localeCompare(b.item.name, 'ar'));
  return <main id="main-content" className="shell page-main"><h1>اكتمال بيانات الأنشطة المنشورة</h1>
    <p>نسبة اكتمال خمسة حقول، وليست توثيقًا لصحة النشاط. صور التصنيفات التوضيحية لا تُحسب صورًا للنشاط. ابدأ بالسجلات الأقل اكتمالًا وراجع المصدر قبل التعديل.</p>
    <div style={{ overflowX: 'auto' }}><table><caption>الهاتف والمواعيد والعنوان والصورة والخريطة</caption><thead><tr><th scope="col">النشاط</th><th scope="col">الاكتمال</th><th scope="col">الحقول الناقصة</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.item.id}><th scope="row"><Link prefetch={false} href={publicBusinessHref(row.item)}>{row.item.name}</Link></th><td>{row.score}%</td><td>{row.missing.join('، ') || 'مكتمل'}</td></tr>)}
    </tbody></table></div></main>;
}
