import Link from 'next/link';
import { businesses, canonicalLocalityName, localities } from '@/lib/data';
import { localCategoryHref } from '@/lib/discovery-routing';
import { cleanPhone, isSafeExternalUrl, whatsappUrl } from '@/lib/site';
import type { Business } from '@/lib/types';
import styles from './local-category-discovery.module.css';

type Props = {
  localityName: string;
  localitySlug: string;
  categoryName: string;
  categoryLabel: string;
  scoped: Business[];
};

function countSubcategories(scoped: Business[]) {
  const counts = new Map<string, number>();
  for (const item of scoped) {
    const label = item.subcategory?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
    .slice(0, 6);
}

function countOtherLocalities(categoryName: string, currentLocality: string) {
  const counts = new Map<string, number>();
  for (const item of businesses) {
    if (item.category !== categoryName) continue;
    const locality = canonicalLocalityName(item.locality);
    if (locality === currentLocality) continue;
    counts.set(locality, (counts.get(locality) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ locality: localities.find((item) => item.name === name), count }))
    .filter((item): item is { locality: NonNullable<typeof item.locality>; count: number } => Boolean(item.locality))
    .sort((a, b) => b.count - a.count || a.locality.name.localeCompare(b.locality.name, 'ar'))
    .slice(0, 6);
}

function actionScore(item: Business) {
  const phone = cleanPhone(item.phone);
  const whatsapp = whatsappUrl(item.phone);
  const map = isSafeExternalUrl(item.mapsUrl);
  return (phone ? 4 : 0) + (whatsapp ? 2 : 0) + (map ? 3 : 0) + Math.min(item.reviews || 0, 50) / 100;
}

export function LocalCategoryDiscovery({
  localityName,
  localitySlug,
  categoryName,
  categoryLabel,
  scoped,
}: Props) {
  const subcategories = countSubcategories(scoped);
  const otherLocalities = countOtherLocalities(categoryName, localityName);
  const quickListings = scoped
    .filter((item) => cleanPhone(item.phone) || isSafeExternalUrl(item.mapsUrl))
    .sort((a, b) => actionScore(b) - actionScore(a) || (b.reviews || 0) - (a.reviews || 0) || a.name.localeCompare(b.name, 'ar'))
    .slice(0, 3);

  if (!subcategories.length && !otherLocalities.length && !quickListings.length) return null;

  return (
    <section id="local-category-discovery" className={styles.section} aria-labelledby="local-category-discovery-title">
      <div className={styles.heading}>
        <div>
          <span>اختصر الطريق</span>
          <h2 id="local-category-discovery-title">استكشف {categoryLabel} في {localityName} بطريقة أسرع</h2>
          <p>ابدأ بالتخصص المطلوب، افتح نشاطًا جاهزًا للوصول، أو انتقل لنفس المجال في قرية أو نجع آخر.</p>
        </div>
        <a className={styles.resultsLink} href="#local-category-results">كل النتائج ↓</a>
      </div>

      <div className={styles.grid}>
        {subcategories.length > 0 && (
          <article className={styles.card}>
            <span className={styles.kicker}>تخصصات داخل {localityName}</span>
            <h3>اختر الخدمة الأدق</h3>
            <p>فلترة مباشرة داخل نفس المكان بدون الرجوع للدليل العام.</p>
            <nav className={styles.pills} aria-label={`تخصصات ${categoryLabel} في ${localityName}`}>
              {subcategories.map(([label, count]) => (
                <Link key={label} href={`/directory?q=${encodeURIComponent(label)}&locality=${encodeURIComponent(localityName)}`} prefetch={false}>
                  <strong>{label}</strong><small>{count.toLocaleString('ar-EG')}</small>
                </Link>
              ))}
            </nav>
          </article>
        )}

        {quickListings.length > 0 && (
          <article className={styles.card}>
            <span className={styles.kicker}>أسرع وصول</span>
            <h3>أنشطة بوسيلة وصول مباشرة</h3>
            <p>اختيارات من النتائج الحالية يتوفر لها اتصال أو واتساب أو خريطة حسب البيانات المنشورة.</p>
            <div className={styles.quickList}>
              {quickListings.map((item) => {
                const phone = cleanPhone(item.phone);
                const whatsapp = whatsappUrl(item.phone);
                const mapsUrl = isSafeExternalUrl(item.mapsUrl) ? item.mapsUrl : null;
                return (
                  <div key={item.id} className={styles.quickItem}>
                    <div>
                      <Link href={`/listing/${item.slug}/`} prefetch={false}>{item.name}</Link>
                      <small>{item.subcategory || item.category}</small>
                    </div>
                    <nav aria-label={`وسائل الوصول إلى ${item.name}`}>
                      {phone && <a href={`tel:${phone}`}>اتصال</a>}
                      {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer">واتساب</a>}
                      {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer">الخريطة</a>}
                    </nav>
                  </div>
                );
              })}
            </div>
          </article>
        )}

        {otherLocalities.length > 0 && (
          <article className={styles.card}>
            <span className={styles.kicker}>نفس المجال · مركز نقادة</span>
            <h3>{categoryLabel} في قرى ونجوع أخرى</h3>
            <p>انتقل مباشرة إلى صفحة محلية ثابتة عند توفرها، أو إلى فلتر المكان للحالات الأقل كثافة.</p>
            <nav className={styles.pills} aria-label={`${categoryLabel} في مواضع أخرى`}>
              {otherLocalities.map(({ locality, count }) => (
                <Link key={locality.slug} href={localCategoryHref(categoryName, locality.name)} prefetch={false}>
                  <strong>{locality.name}</strong><small>{count.toLocaleString('ar-EG')}</small>
                </Link>
              ))}
            </nav>
          </article>
        )}
      </div>

      <footer className={styles.footer}>
        <Link href={`/villages/${localitySlug}`} prefetch={false}>كل خدمات {localityName} ←</Link>
      </footer>
    </section>
  );
}
