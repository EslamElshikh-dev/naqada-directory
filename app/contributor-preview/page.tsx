import type {Metadata} from 'next';
import Link from 'next/link';
import styles from '../knowledge/knowledge.module.css';

export const metadata: Metadata = {
  title: 'معاينة لوحة أحمد الدعباسي | دليل نقادة',
  robots: {index: false, follow: false},
};

const permissions = [
  'إضافة محتوى جديد',
  'تعديل المواد التي ساهمت بها',
  'اقتراح تصحيح',
  'رفع وسائط للمراجعة',
  'إرفاق مصادر',
  'عرض قائمة المراجعة',
  'تعليم مادة بأنها تحتاج تحققًا',
  'اعتماد ضمن نطاق الإشراف',
  'عرض سجل الإصدارات',
  'مقارنة النسخ',
];

export default function ContributorPreviewPage() {
  return (
    <main id="main-content" className="page-main">
      <section className={styles.hero}>
        <div className={`shell ${styles.heroGrid}`}>
          <div>
            <span className={styles.eyebrow}>معاينة آمنة — بدون تسجيل دخول</span>
            <h1>مرحبًا <em>الأستاذ أحمد الدعباسي</em></h1>
            <p>مشرف ومساهم ذهبي · مؤلف «إقليم نقادة بصعيد مصر». هذه معاينة بصرية مطابقة للوحة الحقيقية، من دون عرض جلسة أو بيانات حساسة.</p>
            <div className={styles.badges}>
              <span className={styles.badge}>مؤلف</span>
              <span className={styles.badge}>مساهم ذهبي</span>
              <span className={styles.badge}>مشرف</span>
            </div>
          </div>
          <aside className={styles.stats}>
            <span><b>١٠</b><small>صلاحيات فعالة</small></span>
            <span><b>محمي</b><small>RLS + حساب مسجل</small></span>
          </aside>
        </div>
      </section>

      <div className={`shell ${styles.wrap}`}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span>صلاحيات الحساب</span>
              <h2>ما يمكن للأستاذ أحمد فعله</h2>
            </div>
            <Link href="/contributors/ahmed-aldaabasi">الملف العام ←</Link>
          </div>
          <div className={styles.dashboardGrid}>
            {permissions.map((permission) => (
              <div className={styles.permission} key={permission}>
                <i />
                <strong>{permission}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.notice}>
            الحذف النهائي، إدارة المستخدمين، تغيير الصلاحيات، إعدادات الموقع العامة، والكود ليست ضمن صلاحيات المساهم الذهبي.
          </div>
        </section>
      </div>
    </main>
  );
}
