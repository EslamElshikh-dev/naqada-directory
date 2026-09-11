import type { Metadata } from 'next';
import Link from 'next/link';
import { sanitizeSiteSearchQuery, searchSite, type SiteSearchKind, type SiteSearchResult } from '@/lib/site-search';
import styles from './search.module.css';

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

type SearchGroup = {
  id: string;
  label: string;
  description: string;
  kinds: SiteSearchKind[];
};

const groups: SearchGroup[] = [
  { id: 'directory', label: 'الخدمات والأنشطة', description: 'أنشطة تجارية وخدمية وأقسام الدليل المطابقة لعبارتك.', kinds: ['listing', 'category'] },
  { id: 'places', label: 'القرى والمعالم', description: 'صفحات الأماكن الحالية والمعالم المنشورة في الدليل.', kinds: ['locality', 'landmark'] },
  { id: 'knowledge', label: 'موسوعة نقادة', description: 'أماكن مرجعية وأعلام وموضوعات تراثية بالمصدر والإسناد.', kinds: ['knowledge-place', 'knowledge-person', 'knowledge-heritage'] },
  { id: 'pages', label: 'صفحات الموقع', description: 'صفحات رئيسية قد توصلك مباشرة لما تبحث عنه.', kinds: ['page'] },
];

function queryValue(value?: string | string[]) {
  return sanitizeSiteSearchQuery(Array.isArray(value) ? value[0] : value);
}

function resultGlyph(kind: SiteSearchKind) {
  if (kind === 'listing') return '⌖';
  if (kind === 'category') return '▦';
  if (kind === 'locality' || kind === 'knowledge-place') return '⌂';
  if (kind === 'knowledge-person') return '◉';
  if (kind === 'landmark' || kind === 'knowledge-heritage') return '◇';
  return '↗';
}

function ResultCard({ item }: { item: SiteSearchResult }) {
  return (
    <Link className={styles.resultCard} href={item.href} prefetch={false}>
      <span className={styles.resultIcon} aria-hidden="true">{resultGlyph(item.kind)}</span>
      <span className={styles.resultCopy}>
        <span className={styles.resultTitle}><strong>{item.title}</strong><i>{item.badge}</i></span>
        <small>{item.subtitle}</small>
      </span>
      <b className={styles.resultArrow} aria-hidden="true">←</b>
    </Link>
  );
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const query = queryValue(params.q);
  return {
    title: query ? `نتائج البحث عن ${query} — دليل نقادة` : 'البحث الموحد — دليل نقادة',
    description: 'ابحث في أنشطة وخدمات وقرى ومعالم وموسوعة نقادة من صفحة بحث واحدة.',
    alternates: { canonical: '/search' },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = queryValue(params.q);
  const canSearch = query.length >= 2;
  const results = canSearch ? searchSite(query, 80) : [];
  const grouped = groups.map((group) => ({ ...group, items: results.filter((item) => group.kinds.includes(item.kind)) })).filter((group) => group.items.length > 0);
  const knowledgeCount = results.filter((item) => item.kind.startsWith('knowledge-')).length;
  const directoryCount = results.filter((item) => item.kind === 'listing' || item.kind === 'category').length;
  const placeCount = results.filter((item) => item.kind === 'locality' || item.kind === 'landmark').length;

  return (
    <main id="main-content" className="page-main">
      <section className={styles.hero}>
        <div className={`shell ${styles.heroGrid}`}>
          <div>
            <nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>البحث</span></nav>
            <span className="eyebrow">Unified Search V6</span>
            <h1>ابحث في نقادة كلها من <em>مكان واحد</em></h1>
            <p>نتيجة واحدة قد تكون نشاطًا أو قرية أو معلمًا أو شخصية أو موضوعًا تراثيًا؛ لذلك هذه الصفحة تجمع الدليل والموسوعة بدون خلط نوع كل سجل.</p>
          </div>
          <aside className={styles.heroNote}>
            <span>بحث موحّد</span><strong>الدليل الحديث + الموسوعة المرجعية</strong>
            <p>نتائج الموسوعة تظل موسومة بوضوح، والأنشطة التجارية تحتفظ بأفضلية الترتيب الحالية عند تطابق نية الخدمة.</p>
          </aside>
        </div>
      </section>

      <section className={`shell ${styles.searchArea}`}>
        <form className={styles.searchForm} action="/search" method="get" role="search">
          <label htmlFor="unified-search-input">ما الذي تبحث عنه؟</label>
          <div className={styles.searchRow}>
            <input id="unified-search-input" name="q" defaultValue={query} maxLength={100} autoComplete="off" inputMode="search" placeholder="مثال: صيدلية، بشلاو، عبد الرحيم القمولي، هرم جُرن الشعير…" />
            <button type="submit">بحث موحّد</button>
          </div>
          <small>اكتب حرفين على الأقل. صفحة البحث نفسها غير مفهرسة في Google لتجنب إنشاء صفحات استعلام ضعيفة.</small>
        </form>

        {!canSearch ? (
          <div className={styles.startState}>
            <span className={styles.stateIcon} aria-hidden="true">⌕</span>
            <div><strong>ابدأ باسم خدمة أو مكان أو شخصية</strong><p>البحث السريع في الهيدر والصفحة الرئيسية يستخدم نفس المحرك الذي تستخدمه هذه الصفحة.</p></div>
            <nav className={styles.quickLinks} aria-label="أمثلة بحث سريعة">
              <Link href="/search?q=صيدلية">صيدلية</Link><Link href="/search?q=بشلاو">بشلاو</Link><Link href="/search?q=عبد%20الرحيم%20القمولي">عبد الرحيم القمولي</Link><Link href="/search?q=تراث">تراث</Link>
            </nav>
          </div>
        ) : results.length ? (
          <>
            <div className={styles.summary} aria-label="ملخص نتائج البحث">
              <div><span>نتائج لعبارة</span><strong>«{query}»</strong><small>{results.length.toLocaleString('ar-EG')} نتيجة مرتبة حسب الصلة</small></div>
              <div className={styles.metrics}>
                <span><b>{directoryCount.toLocaleString('ar-EG')}</b><small>أنشطة وأقسام</small></span>
                <span><b>{placeCount.toLocaleString('ar-EG')}</b><small>قرى ومعالم</small></span>
                <span><b>{knowledgeCount.toLocaleString('ar-EG')}</b><small>نتائج موسوعية</small></span>
              </div>
            </div>
            <nav className={styles.groupRail} aria-label="الانتقال بين أنواع النتائج">
              {grouped.map((group) => <a href={`#${group.id}`} key={group.id}>{group.label}<b>{group.items.length.toLocaleString('ar-EG')}</b></a>)}
            </nav>
            <div className={styles.groups}>
              {grouped.map((group) => (
                <section className={styles.group} id={group.id} key={group.id}>
                  <header className={styles.groupHead}>
                    <div><span>{group.items.length.toLocaleString('ar-EG')} نتيجة</span><h2>{group.label}</h2><p>{group.description}</p></div>
                    {group.id === 'directory' ? <Link href={`/directory?q=${encodeURIComponent(query)}`}>بحث الأنشطة فقط ←</Link> : null}
                    {group.id === 'knowledge' ? <Link href="/knowledge">فتح الموسوعة ←</Link> : null}
                  </header>
                  <div className={styles.resultsGrid}>{group.items.map((item) => <ResultCard item={item} key={`${item.kind}-${item.href}`} />)}</div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.stateIcon} aria-hidden="true">⌕</span>
            <div><strong>لم نجد نتيجة مطابقة لـ«{query}»</strong><p>جرّب اسمًا أقصر، تهجئة أخرى، أو انتقل للدليل والموسوعة يدويًا.</p></div>
            <div className={styles.emptyActions}><Link href="/directory">فتح دليل الأنشطة</Link><Link href="/knowledge">فتح موسوعة نقادة</Link><Link href="/contribute">أضف أو صحح معلومة</Link></div>
          </div>
        )}
      </section>
    </main>
  );
}
