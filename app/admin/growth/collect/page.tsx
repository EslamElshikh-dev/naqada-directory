import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isDirectoryAdmin } from '@/lib/auth/admin';
import { resolveSession } from '@/lib/auth/session';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { businesses } from '@/lib/data';
import { isSearchGapOpen } from '@/lib/growth-priority';
import { normalizeArabic } from '@/lib/site';
import { sanitizeSiteSearchQuery, searchSite } from '@/lib/site-search';
import styles from './collect.module.css';

export const metadata: Metadata = {
  title: 'جمع معلومات الأنشطة | إدارة دليل نقادة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[]; locality?: string | string[] }>;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CollectGrowthLead({ searchParams }: Props) {
  const session = await resolveSession(false);
  if (!session || !(await isDirectoryAdmin(session.accessToken))) redirect('/account');

  const params = await searchParams;
  const query = sanitizeSiteSearchQuery(first(params.q));
  const locality = sanitizeSiteSearchQuery(first(params.locality));
  const category = sanitizeSiteSearchQuery(first(params.category));
  const catalog = await getPublicBusinessCatalog().catch(() => null);
  const activeBusinesses = catalog?.businesses || businesses;
  const normalized = normalizeArabic(query);
  const homeware = /ادوات|منزليه/.test(normalized);
  const exactMatches = query ? searchSite(query, 6, ['listing'], activeBusinesses) : [];
  const relatedMatches = homeware && !exactMatches.length
    ? searchSite('أدوات منزلية', 8, ['listing'], activeBusinesses)
    : [];
  const open = query ? isSearchGapOpen(query, activeBusinesses) : false;

  const contributionParams = new URLSearchParams({ type: 'missing', name: query });
  if (category) contributionParams.set('category', category);
  if (locality) contributionParams.set('locality', locality);

  const searches = query ? [
    { title: 'ابحث في Google', subtitle: 'تحقّق من الاسم والمكان وحداثة المعلومات', href: `https://www.google.com/search?q=${encodeURIComponent(`${query} نقادة قنا`)}` },
    { title: 'افتح خرائط Google', subtitle: 'قارن العنوان والهاتف ومعرّف المكان', href: `https://www.google.com/maps/search/${encodeURIComponent(`${query} نقادة قنا`)}` },
    { title: 'ابحث في Facebook', subtitle: 'راجع صفحة النشاط ومنشوراته الأصلية', href: `https://www.facebook.com/search/top?q=${encodeURIComponent(`${query} نقادة قنا`)}` },
  ] : [];

  return (
    <main id="main-content" className={`admin-page ${styles.page}`}>
      <div className="shell">
        <nav className={styles.breadcrumb} aria-label="مسار العمل"><Link href="/admin/growth" prefetch={false}>أولويات النمو</Link><span>←</span><span>جمع المعلومات</span></nav>
        <header className={styles.hero}>
          <span>مساحة جمع المعلومات</span>
          <h1>{query ? <>تحقّق من «{query}»</> : 'ابدأ طلب جمع معلومات'}</h1>
          <p>ابدأ بمطابقة السجلات المنشورة، ثم راجع المصادر الأصلية. لا تنشر اسم محل أو عنوانًا أو بيعًا بالجملة قبل التحقق منه.</p>
          <form action="/admin/growth/collect" method="get" role="search" className={styles.search}>
            <label htmlFor="collect-query">عبارة البحث</label>
            <div><input id="collect-query" name="q" defaultValue={query} maxLength={100} placeholder="اسم النشاط أو نوع الخدمة" required /><button type="submit">افحص العبارة</button></div>
          </form>
        </header>

        {query ? <>
          <div className={styles.status} role="status"><b className={open ? styles.open : styles.resolved}>{open ? 'فجوة ما زالت مفتوحة' : 'لهذه العبارة نتيجة حالية'}</b><span>{[category, locality].filter(Boolean).join(' · ') || 'البحث يشمل كل قرى مركز نقادة'}</span></div>
          <div className={styles.columns}>
            <section className={styles.panel}>
              <span className={styles.eyebrow}>01 · بيانات الدليل</span>
              <h2>{exactMatches.length ? 'نشاط منشور يطابق العبارة' : 'لا توجد مطابقة مباشرة'}</h2>
              {exactMatches.length ? <ul className={styles.matches}>{exactMatches.map((item) => <li key={item.href}><Link href={item.href} prefetch={false}><strong>{item.title}</strong><small>{item.subtitle}</small><b>راجع السجل ←</b></Link></li>)}</ul> : <p>العبارة لا تطابق نشاطًا منشورًا حاليًا. ظهور متاجر مشابهة لا يثبت أنها تبيع بالجملة أو أنها «البراق» المقصود.</p>}
              {relatedMatches.length ? <div className={styles.alternatives}><h3>متاجر أدوات منزلية قريبة من الموضوع</h3><p>نتائج مرتبطة بالنوع فقط؛ البيع بالجملة غير مثبت لهذه النتائج.</p><ul className={styles.matches}>{relatedMatches.map((item) => <li key={item.href}><Link href={item.href} prefetch={false}><strong>{item.title}</strong><small>{item.subtitle}</small><b>راجع البيانات ←</b></Link></li>)}</ul></div> : null}
            </section>

            <section className={styles.panel}>
              <span className={styles.eyebrow}>02 · المصادر المفتوحة</span>
              <h2>افحص الاسم والقرية ووسيلة التواصل</h2>
              <div className={styles.sourceLinks}>{searches.map((source) => <a key={source.title} href={source.href} target="_blank" rel="noopener noreferrer"><strong>{source.title} ↗</strong><small>{source.subtitle}</small></a>)}</div>
              {homeware ? <aside className={styles.lead}><b>خيط من السوشيال ميديا يحتاج تأكيدًا</b><p>صفحة «أبو مروان لتجهيز العروسة بطوخ» نشرت بيع أدوات منزلية بالجملة والقطاعي وذكرت طوخ، نقادة. المنشورات التي ظهرت في البحث قديمة؛ يلزم التأكد من استمرار النشاط قبل نشره.</p><a href="https://www.facebook.com/abumarwanlitajhizalearusihbutukh/videos/737259768108409/" target="_blank" rel="noopener noreferrer">راجع المنشور الأصلي ↗</a></aside> : null}
            </section>
          </div>
          <section className={styles.next}><div><span className={styles.eyebrow}>03 · الخطوة التالية</span><h2>وثّق ما وصلت إليه</h2><p>لو وجدت مصدرًا مباشرًا، أرسل الاسم والعنوان والرابط لقائمة المراجعة. المساهمة لا تنشر سجلًا تلقائيًا.</p></div><Link href={`/contribute?${contributionParams.toString()}`} prefetch={false}>سجّل دليلًا للمراجعة ←</Link></section>
        </> : <section className={styles.panel}><h2>ابدأ بعبارة من أولويات النمو</h2><p>اكتب اسم النشاط أو الخدمة في الحقل أعلاه، أو ارجع إلى طابور الأولويات.</p><Link href="/admin/growth">العودة إلى الأولويات ←</Link></section>}
      </div>
    </main>
  );
}
