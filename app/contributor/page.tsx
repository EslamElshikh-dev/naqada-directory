import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getContributorAccess, getContributorActivity } from '@/lib/auth/contributor';
import { resolveSession } from '@/lib/auth/session';
import { fieldInformants, knowledgeHeritage, knowledgePeople, knowledgePlaces, knowledgeReferences, knowledgeSources } from '@/lib/knowledge';
import { MemberAvatar } from '@/components/auth/member-avatar';
import styles from './contributor.module.css';

export const metadata: Metadata = { title: 'لوحة المساهم — دليل نقادة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const permissionLabels: Record<string, string> = {
  'content.create': 'إضافة محتوى جديد',
  'content.edit_own': 'تعديل المواد التي ساهمت بها',
  'content.propose_correction': 'اقتراح تصحيح',
  'media.upload': 'رفع وسائط للمراجعة',
  'sources.attach': 'إرفاق مصادر',
  'review.view_queue': 'عرض قائمة المراجعة',
  'review.mark_needs_verification': 'تعليم مادة بأنها تحتاج تحققًا',
  'review.approve_scoped': 'اعتماد ضمن نطاق الإشراف',
  'revision.view_history': 'عرض سجل الإصدارات',
  'revision.compare': 'مقارنة النسخ',
};

const statusLabels: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  reviewing: 'قيد المراجعة',
  approved: 'معتمد',
  published: 'منشور',
  rejected: 'غير معتمد',
};

const requestLabels: Record<string, string> = {
  add: 'إضافة',
  correction: 'تصحيح',
  missing: 'نتيجة مفقودة',
};

export default async function ContributorDashboard() {
  const session = await resolveSession(false);
  if (!session) redirect('/account/login?next=/contributor');
  const access = await getContributorAccess(session.accessToken, session.user.id).catch(() => null);
  if (!access) {
    return <main id="main-content" className={styles.page}><div className="shell" style={{ padding: '48px 0' }}><section className={styles.section}><span>منطقة المساهمين</span><h1>الحساب غير مربوط بصلاحية مساهم</h1><p>هذا الحساب عضو عادي في دليل نقادة حاليًا.</p><Link href="/account">العودة إلى حسابي ←</Link></section></div></main>;
  }

  const activity = await getContributorActivity(session.accessToken, session.user.id).catch(() => ({ total: 0, pending: 0, reviewing: 0, approved: 0, published: 0, rejected: 0, recent: [] }));
  const knowledgeTotal = knowledgePlaces.length + knowledgePeople.length + knowledgeHeritage.length + knowledgeReferences.length + fieldInformants.length;

  const actions = [
    { href: '/contribute?type=add', icon: '+', title: 'إضافة محتوى أو سجل', note: 'ابدأ مساهمة جديدة وأرفق المصدر.' },
    { href: '/contribute?type=correction', icon: '✎', title: 'اقتراح تصحيح', note: 'صحح معلومة قائمة وأرسلها للمراجعة.' },
    { href: '/knowledge', icon: '⌘', title: 'موسوعة نقادة', note: 'راجع الأماكن والأعلام والتراث والمراجع.' },
    { href: `/contributors/${access.slug}`, icon: '◎', title: 'ملفي العام', note: 'عاين صفحة المؤلف والمساهم كما يراها الزائر.' },
    { href: '/knowledge/references', icon: '↗', title: 'المراجع', note: 'راجع الفهرس المرجعي المرتبط بالمحتوى.' },
    { href: '/knowledge/fieldwork', icon: '◌', title: 'العمل الميداني', note: 'استعرض الأسماء والنطاقات الميدانية الموثقة.' },
  ];

  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}>
        <div className={`shell ${styles.heroGrid}`}>
          <div className={styles.identity}>
            <MemberAvatar name={access.displayName} frame="gold" size={104} badge={access.roleLabel} priority />
            <div className={styles.identityCopy}>
              <span>لوحة المساهم المحمية</span>
              <h1>مرحبًا <em>{access.honorific ? `${access.honorific} ` : ''}{access.displayName}</em></h1>
              <p>{access.roleLabel}{access.primaryWork ? ` · مؤلف «${access.primaryWork}»` : ''}. من هنا تدير مساهماتك وتراجع المواد المرجعية المرتبطة بك داخل دليل نقادة.</p>
              <div className={styles.badges}>{access.badges.map((badge) => <span key={badge}>{badge}</span>)}</div>
            </div>
          </div>
          <aside className={styles.heroStats}>
            <div><strong>{knowledgeTotal.toLocaleString('ar-EG')}</strong><span>مدخلًا معرفيًا مرتبطًا بالمادة المرجعية</span></div>
            <div><strong>{access.permissions.length.toLocaleString('ar-EG')}</strong><span>صلاحيات فعالة</span></div>
            <div><strong>{activity.total.toLocaleString('ar-EG')}</strong><span>مقترحات أرسلتها من حسابك</span></div>
            <div><strong>{(activity.approved + activity.published).toLocaleString('ar-EG')}</strong><span>مقترحات معتمدة أو منشورة</span></div>
          </aside>
        </div>
      </section>

      <div className={`shell ${styles.wrap}`}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><span>إجراءات سريعة</span><h2>ابدأ من هنا</h2><p>أهم المسارات التي تحتاجها مرتبة في مكان واحد.</p></div></div>
          <div className={styles.actionGrid}>{actions.map((action) => <Link key={action.href} href={action.href} className={styles.action}><b>{action.icon}</b><div><strong>{action.title}</strong><small>{action.note}</small></div></Link>)}</div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><span>إحصائيات المحتوى</span><h2>أثر مساهمتك داخل دليل نقادة</h2><p>الأرقام هنا تحسب الطبقات المرجعية المنسوبة إلى المواد التي قدمتها للدليل.</p></div><Link href={`/contributors/${access.slug}`}>فتح الملف العام ←</Link></div>
          <div className={styles.metricGrid}>
            <div className={styles.metric}><strong>{knowledgePlaces.length.toLocaleString('ar-EG')}</strong><span>مكانًا وموضعًا</span></div>
            <div className={styles.metric}><strong>{knowledgePeople.length.toLocaleString('ar-EG')}</strong><span>شخصية وعلمًا</span></div>
            <div className={styles.metric}><strong>{knowledgeHeritage.length.toLocaleString('ar-EG')}</strong><span>موضوعًا تراثيًا</span></div>
            <div className={styles.metric}><strong>{knowledgeReferences.length.toLocaleString('ar-EG')}</strong><span>مرجعًا</span></div>
            <div className={styles.metric}><strong>{fieldInformants.length.toLocaleString('ar-EG')}</strong><span>اسمًا من العمل الميداني</span></div>
            <div className={styles.metric}><strong>{knowledgeSources.length.toLocaleString('ar-EG')}</strong><span>مصادر وملفات مرتبطة</span></div>
          </div>
        </section>

        <div className={styles.twoCol}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><div><span>مساهمات الحساب</span><h2>حالة المقترحات</h2><p>أي مقترح جديد ترسله وأنت مسجل الدخول يُنسب لحسابك تلقائيًا.</p></div><Link href="/contribute">إضافة مساهمة ←</Link></div>
            <div className={styles.statusGrid}>
              <div className={styles.statusCard}><b>{activity.pending.toLocaleString('ar-EG')}</b><span>بانتظار المراجعة</span></div>
              <div className={styles.statusCard}><b>{activity.reviewing.toLocaleString('ar-EG')}</b><span>قيد المراجعة</span></div>
              <div className={styles.statusCard}><b>{activity.approved.toLocaleString('ar-EG')}</b><span>معتمد</span></div>
              <div className={styles.statusCard}><b>{activity.published.toLocaleString('ar-EG')}</b><span>منشور</span></div>
            </div>
            <div className={styles.activityList} style={{ marginTop: 16 }}>
              {activity.recent.length ? activity.recent.map((item) => <div className={styles.activityItem} key={item.id}><div><strong>{requestLabels[item.requestType] || item.requestType}: {item.name}</strong><small>{item.locality || 'نطاق عام'} · {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.createdAt))}</small></div><span className={styles.status}>{statusLabels[item.status] || item.status}</span></div>) : <div className={styles.empty}>لا توجد مقترحات شخصية مسجلة من الحساب حتى الآن. المواد المرجعية المستوردة والمنسوبة لك ظاهرة في إحصائيات المحتوى بالأعلى.</div>}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}><div><span>صلاحيات الحساب</span><h2>ما يمكنك تنفيذه</h2><p>قائمة واضحة بالصلاحيات الفعالة المرتبطة بدورك.</p></div></div>
            <div className={styles.permissionGrid}>{access.permissions.map((permission) => <div className={styles.permission} key={permission}><i/><strong>{permissionLabels[permission] || permission}</strong></div>)}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
