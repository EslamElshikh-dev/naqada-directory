import styles from './collect.module.css';

export default function LoadingCollectGrowthLead() {
  return <main id="main-content" className={`admin-page ${styles.page}`}><div className="shell"><div className={styles.hero} role="status" aria-live="polite"><span>مساحة جمع المعلومات</span><h1>جارٍ تجهيز طلب البحث…</h1><p>بنراجع بيانات الدليل ونجهّز روابط المصادر.</p></div></div></main>;
}
