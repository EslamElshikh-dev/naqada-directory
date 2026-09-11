import type { Metadata } from 'next';
import Link from 'next/link';
import { recoverSiteSearch, sanitizeSiteSearchQuery, searchSite, type SiteSearchKind, type SiteSearchResult } from '@/lib/site-search';
import styles from './search.module.css';

type SearchScope = 'all' | 'directory' | 'places' | 'knowledge';

type Props = {
  searchParams: Promise<{ q?: string | string[]; scope?: string | string[] }>;
};

type SearchGroup = {
  id: Exclude<SearchScope, 'all'> | 'pages';
  label: string;
  description: string;
  kinds: SiteSearchKind[];
};

type ScopeOption = {
  id: SearchScope;
  label: string;
  shortLabel: string;
  kinds?: SiteSearchKind[];
};

const groups: SearchGroup[] = [
  {
    id: 'directory',
    label: 'الخدمات والأنشطة',
    description: 'أنشطة تجارية وخدمية وأقسام الدليل المطابقة لعبارتك.',
    kinds: ['listing', 'category'],
  },
  {
    id: 'places',
    label: 'القرى والمعالم',
    description: 'صفحات الأماكن الحالية والمعالم المنشورة في الدليل.',
    kinds: ['locality', 'landmark'],
  },
  {
    id: 'knowledge',
    label: 'موسوعة نقادة',
    description: 'أماكن مرجعية وأعلام وموضوعات تراثية بالمصدر والإسناد.',
    kinds: ['knowledge-place', 'knowledge-person', 'knowledge-heritage'],
  },
  {
    id: 'pages',
    label: 'صفحات الموقع',
    description: 'صفحات رئيسية قد توصلك مباشرة لما تبحث عنه.',
    kinds: ['page'],
  },
];

const scopeOptions: ScopeOption[] = [
  { id: 'all', label: 'كل النتائج', shortLabel: 'الكل' },
  { id: 'directory', label: 'الخدمات والأنشطة', shortLabel: 'الأنشطة', kinds: ['listing', 'category'] },
  { id: 'places', label: 'القرى والمعالم', shortLabel: 'الأماكن', kinds: ['locality', 'landmark'] },
  { id: 'knowledge', label: 'موسوعة نقادة', shortLabel: 'الموسوعة', kinds: ['knowledge-place', 'knowledge-person', 'knowledge-heritage'] },
];

function queryValue(value?: string | string[]) {
  return sanitizeSiteSearchQuery(Array.isArray(value) ? value[0] : value);
}

function scopeValue(value?: string | string[]): SearchScope {
  const raw = Array.isArray(value) ? value[0] : value;
  return scopeOptions.some((item) => item.id === raw) ? raw as SearchScope : 'all';
}

function searchHref(query: string, scope: SearchScope) {
  const queryPart = `q=${encodeURIComponent(query)}`;
  return `/search?${queryPart}${scope === 'all' ? '' : `&scope=${scope}`}`;
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
  const scope = scopeValue(params.scope);
  const scopeLabel = scopeOptions.find((item) => item.id === scope)?.shortLabel;
  return {
    title: query ? `نتائج ${scopeLabel} عن ${query} — دليل نقادة` : 'البحث الموحد — دليل نقادة',
    description: 'ابحث في أنشطة وخدمات وقرى ومعالم وموسوعة نقادة من صفحة بحث واحدة.',
    alternates: { canonical: '/search' },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = queryValue(params.q);
  const activeScope = scopeValue(params.scope);
  const canSearch = query.length >= 2;
  const allResults = canSearch ? searchSite(query, Number.MAX_SAFE_INTEGER) : [];

  const counts = {
    all: allResults.length,
    directory: allResults.filter((item) => item.kind === 'listing' || item.kind === 'category').length,
    places: allResults.filter((item) => item.kind === 'locality' || item.kind === 'landmark').length,
    knowledge: allResults.filter((item) => item.kind.startsWith('knowledge-')).length,
  };

  const activeOption = scopeOptions.find((item) => item.id === activeScope) || scopeOptions[0];
  const scopedResults = activeOption.kinds ? allResults.filter((item) => activeOption.kinds?.includes(item.kind)) : allResults;
  const results = scopedResults.slice(0, 80);
  const grouped = groups
    .map((group) => ({ ...group, items: results.filter((item) => group.kinds.includes(item.kind)) }))
    .filter((group) => group.items.length > 0);
  const recoverySuggestions = canSearch && !scopedResults.length
    ? recoverSiteSearch(query, activeOption.kinds, 4)
    : [];

  const hasMore = scopedResults.length > results.length;

  return (
    <main id="main-content" className="page-main">
      <section className={styles.hero}>
        <div className={`shell ${styles.heroGrid}`}>
          <div>
            <nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>البحث</span></nav>
            <span className="eyebrow">Search Recovery V9</span>
            <h1>ابحث بطريقتك ولو مفيش تطابق <em>نساعدك توصل</em></h1>
            <p>البحث الأساسي يظل دقيقًا وصارمًا، وإذا لم يجد نتيجة نقترح تصحيحًا إملائيًا محافظًا أو بحثًا أوسع بدل عرض نتائج غير مؤكدة.</p>
          </div>
          <aside className={styles.heroNote}>
            <span>تعافٍ آمن من صفر نتائج</span>
            <strong>تطابق دقيق أولًا · اقتراحات منفصلة ثانيًا</strong>
            <p>الاقتراحات لا تدخل داخل ترتيب النتائج ولا تغيّر بيانات الدليل؛ الزائر يختارها بنفسه فقط عند الحاجة.</p>
          </aside>
        </div>
      </section>

      <section className={`shell ${styles.searchArea}`}>
        <form className={styles.searchForm} action="/search" method="get" role="search">
          <label htmlFor="unified-search-input">ما الذي تبحث عنه؟</label>
          <div className={styles.searchRow}>
            <input id="unified-search-input" name="q" defaultValue={query} maxLength={100} autoComplete="off" inputMode="search" placeholder="مثال: صيدلية في الخطارة، دكتور أسنان بشلاو، عبد الرحيم القمولي…" />
            {activeScope !== 'all' ? <input type="hidden" name="scope" value={activeScope} /> : null}
            <button type="submit">بحث موحّد</button>
          </div>
          <small>اكتب حرفين على الأقل. صفحات نتائج البحث غير مفهرسة في Google، والاقتراحات لا تظهر إلا عند عدم وجود تطابق دقيق.</small>
        </form>

        {canSearch ? (
          <nav className={styles.scopeRail} aria-label="تصفية نتائج البحث حسب النية">
            {scopeOptions.map((option) => (
              <Link
                key={option.id}
                href={searchHref(query, option.id)}
                className={activeScope === option.id ? styles.scopeActive : undefined}
                aria-current={activeScope === option.id ? 'page' : undefined}
                prefetch={false}
              >
                <span>{option.label}</span>
                <b>{counts[option.id].toLocaleString('ar-EG')}</b>
              </Link>
            ))}
          </nav>
        ) : null}

        {!canSearch ? (
          <div className={styles.startState}>
            <span className={styles.stateIcon} aria-hidden="true">⌕</span>
            <div><strong>ابدأ باسم خدمة أو مكان أو شخصية</strong><p>البحث السريع في الهيدر والصفحة الرئيسية يستخدم نفس المحرك الذي تستخدمه هذه الصفحة.</p></div>
            <nav className={styles.quickLinks} aria-label="أمثلة بحث سريعة">
              <Link href="/search?q=صيدلية%20في%20الخطارة&scope=directory">صيدلية في الخطارة</Link>
              <Link href="/search?q=بشلاو&scope=places">بشلاو</Link>
              <Link href="/search?q=عبد%20الرحيم%20القمولي&scope=knowledge">عبد الرحيم القمولي</Link>
              <Link href="/search?q=تراث&scope=knowledge">تراث</Link>
            </nav>
          </div>
        ) : scopedResults.length ? (
          <>
            <div className={styles.summary} aria-label="ملخص نتائج البحث">
              <div>
                <span>{activeScope === 'all' ? 'كل النتائج لعبارة' : `${activeOption.label} لعبارة`}</span>
                <strong>«{query}»</strong>
                <small>
                  {scopedResults.length.toLocaleString('ar-EG')} نتيجة مطابقة
                  {hasMore ? ` · نعرض أول ${results.length.toLocaleString('ar-EG')} نتيجة حسب الصلة` : ' · معروضة بالكامل حسب الصلة'}
                </small>
              </div>
              <div className={styles.metrics}>
                <span><b>{counts.directory.toLocaleString('ar-EG')}</b><small>أنشطة وأقسام</small></span>
                <span><b>{counts.places.toLocaleString('ar-EG')}</b><small>قرى ومعالم</small></span>
                <span><b>{counts.knowledge.toLocaleString('ar-EG')}</b><small>نتائج موسوعية</small></span>
              </div>
            </div>

            {grouped.length > 1 ? (
              <nav className={styles.groupRail} aria-label="الانتقال بين أنواع النتائج">
                {grouped.map((group) => <a href={`#${group.id}`} key={group.id}>{group.label}<b>{group.items.length.toLocaleString('ar-EG')}</b></a>)}
              </nav>
            ) : null}

            <div className={styles.groups}>
              {grouped.map((group) => (
                <section className={styles.group} id={group.id} key={group.id}>
                  <header className={styles.groupHead}>
                    <div><span>{group.items.length.toLocaleString('ar-EG')} نتيجة معروضة</span><h2>{group.label}</h2><p>{group.description}</p></div>
                    {group.id === 'directory' ? <Link href={`/directory?q=${encodeURIComponent(query)}`}>فتح دليل الأنشطة ←</Link> : null}
                    {group.id === 'knowledge' ? <Link href="/knowledge">فتح الموسوعة ←</Link> : null}
                    {group.id === 'places' ? <Link href="/villages">كل القرى والنجوع ←</Link> : null}
                  </header>
                  <div className={styles.resultsGrid}>{group.items.map((item) => <ResultCard item={item} key={`${item.kind}-${item.href}`} />)}</div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.stateIcon} aria-hidden="true">⌕</span>
            <div><strong>لا توجد نتائج دقيقة داخل «{activeOption.label}» لعبارة «{query}»</strong><p>{recoverySuggestions.length ? 'وجدنا اقتراحات أقرب مبنية على بيانات الدليل نفسها؛ اختر واحدًا منها لو كان هو المقصود.' : 'جرّب «كل النتائج»، أو غيّر العبارة، أو انتقل للقسم المناسب يدويًا.'}</p></div>

            {recoverySuggestions.length ? (
              <section className={styles.recoveryPanel} aria-label="اقتراحات لاستعادة البحث">
                <header><span>اقتراحات آمنة</span><strong>هل تقصد واحدًا من دول؟</strong><p>لن نعرض الاقتراح كنتيجة تلقائيًا؛ افتحه فقط إذا كان يعبّر عن قصدك.</p></header>
                <div className={styles.recoveryGrid}>
                  {recoverySuggestions.map((suggestion) => (
                    <Link href={searchHref(suggestion.query, activeScope)} key={`${suggestion.reason}-${suggestion.query}`} prefetch={false}>
                      <span>{suggestion.reason}</span>
                      <strong>«{suggestion.query}»</strong>
                      <small>{suggestion.count.toLocaleString('ar-EG')} نتيجة متوقعة</small>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <div className={styles.emptyActions}>
              <Link href={searchHref(query, 'all')}>عرض كل النتائج</Link>
              <Link href="/directory">فتح دليل الأنشطة</Link>
              <Link href="/knowledge">فتح موسوعة نقادة</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
