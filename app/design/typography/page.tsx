import '@/app/route-styles/design-typography.css';
import type { Metadata } from 'next';
import { plexFont } from '@/app/fonts';
import { readexFont } from './readex-font';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { businessSummary, cleanPhone, formatDate } from '@/lib/site';
import styles from './typography.module.css';

export const metadata: Metadata = {
  title: 'مقارنة خطوط الدليل', robots: { index: false, follow: false }, alternates: { canonical: null },
};
export const dynamic = 'force-dynamic';
export default async function TypographyPage() {
  const { businesses } = await getPublicBusinessCatalog();
  const listing = businesses.find(item => item.name.includes('مستشفى النيل')) || businesses[0];
  return <main id="main-content" className={'shell ' + styles.page}>
    <h1>خط واضح، وحكاية أسهل في القراءة.</h1>
    <p>قارن IBM Plex Sans Arabic الافتراضي مع Readex Pro، والعناوين بخط Noto Kufi Arabic.</p>
    <div className={styles.grid}>{[
      { label: 'A — المقترح الأساسي', font: plexFont.className, family: 'IBM Plex Sans Arabic' },
      { label: 'B — البديل', font: readexFont.className, family: 'Readex Pro' },
    ].map(sample => <article key={sample.label} className={styles.sample + ' ' + sample.font} style={{ fontFamily: sample.family }}>
      <div className={styles.hero}><span>{sample.label}</span><h2>محتاج إيه <em>في نقادة؟</em></h2><p>دوّر على خدمة، شوف فرصة شغل، أو اعرف أخبار بلدك وحكاياتها.</p></div>
      <div className={styles.content}>{listing ? <><h3>{listing.name}</h3><p>{listing.description || businessSummary(listing)}</p>
        {cleanPhone(listing.phone) && <a href={'tel:' + cleanPhone(listing.phone)}>اتصال الآن</a>}
        {listing.mapsUrl && <a href={listing.mapsUrl} target="_blank" rel="noreferrer">الاتجاهات</a>}
        <small>آخر مراجعة <bdi>{formatDate(listing.checked)}</bdi> · <bdi>{listing.phone || 'لم يُنشر رقم هاتف'}</bdi></small></> : <p>لم تتوفر عينة منشورة الآن.</p>}
        <h3>حكايات من بلدنا</h3><p>للمعلومة حكاية، وللحكاية مصدر. هنا نجمع أخبار أهل نقادة وتراثهم، ونفتح باب التصحيح والإضافة لأهل البلد.</p>
      </div>
    </article>)}</div>
  </main>;
}
