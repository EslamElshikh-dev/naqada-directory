import { NUMBER_LOCALE } from '@/lib/format-number';
import type { Metadata } from 'next';
import Link from 'next/link';
import { UtilityPageHeader } from '@/components/utility-page-header';
import { SearchJourneyPanel } from '@/components/search-journey';
import { SearchAnalytics } from '@/components/search-analytics';
import { buildSearchContext } from '@/lib/search-context';
import { buildSearchJourney } from '@/lib/search-journey';
import { recoverSiteSearch, sanitizeSiteSearchQuery, searchSite, type SiteSearchKind, type SiteSearchResult } from '@/lib/site-search';
import { buildPageMetadata, normalizeArabic } from '@/lib/site';
import { getPublicEditorialPosts, getPublicRoleModels } from '@/lib/article-content';
import { getPublicBusinessCatalog } from '@/lib/curated-content';
import { jobSearchIntent } from '@/lib/job-search';
import contextStyles from './search-context.module.css';
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
    kinds: ['knowledge-place', 'knowledge-person', 'knowledge-heritage', 'role-model'],
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
  { id: 'knowledge', label: 'موسوعة نقادة', shortLabel: 'الموسوعة', kinds: ['knowledge-place', 'knowledge-person', 'knowledge-heritage', 'role-model'] },
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
  if (kind === 'knowledge-person' || kind === 'role-model') return '◉';
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
  return buildPageMetadata({
    title: query ? `نتائج ${scopeLabel} عن ${query}` : 'البحث الموحد',
    description: 'ابحث في أنشطة وخدمات وقرى ومعالم وموسوعة نقادة من صفحة بحث واحدة.',
    path: '/search',
    robots: { index: false, follow: true },
  });
}

export default async function SearchPage({ searchParams }: Props) {
  const [params, catalog, people, posts] = await Promise.all([searchParams, getPublicBusinessCatalog(), getPublicRoleModels(), getPublicEditorialPosts()]);
  const query = queryValue(params.q);
  const activeScope = scopeValue(params.scope);
  const canSearch = query.length >= 2;
  const jobIntent = canSearch ? jobSearchIntent(query) : null;
  const allResults = canSearch ? searchSite(query, Number.MAX_SAFE_INTEGER, undefined, catalog.businesses, { people, posts }) : [];
  const searchContext = canSearch && !jobIntent && (activeScope === 'all' || activeScope === 'directory')
    ? buildSearchContext(query)
    : null;
  const searchJourney = searchContext ? buildSearchJourney(query) : null;

  const counts = {
    all: allResults.length,
    directory: allResults.filter((item) => item.kind === 'listing' || item.kind === 'category').length,
    places: allResults.filter((item) => item.kind === 'locality' || item.kind === 'landmark').length,
    knowledge: allResults.filter((item) => item.kind.startsWith('knowledge-') || item.kind === 'role-model').length,
  };

  const activeOption = scopeOptions.find((item) => item.id === activeScope) || scopeOptions[0];
  const scopedResults = activeOption.kinds ? allResults.filter((item) => activeOption.kinds?.includes(item.kind)) : allResults;
  const results = scopedResults.slice(0, 80);
  const grouped = groups
    .map((group) => ({ ...group, items: results.filter((item) => group.kinds.includes(item.kind)) }))
    .filter((group) => group.items.length > 0);
  const recoverySuggestions = canSearch && !scopedResults.length && !jobIntent
    ? recoverSiteSearch(query, activeOption.kinds, 4, catalog.businesses, { people, posts })
    : [];
  const normalizedQuery = normalizeArabic(query);
  const isWholesaleHomeware = canSearch
    && (activeScope === 'all' || activeScope === 'directory')
    && normalizedQuery.includes('جمله')
    && /ادوات|منزليه/.test(normalizedQuery);
  const relatedHomeware = isWholesaleHomeware && !scopedResults.length
    ? searchSite('أدوات منزلية', 8, ['listing'], catalog.businesses, { people, posts })
    : [];

  const hasMore = scopedResults.length > results.length;

  return (
    <main id="main-content" className="page-main">
      {canSearch ? <SearchAnalytics query={query} count={scopedResults.length} scope={activeScope} /> : null}
      <UtilityPageHeader current="البحث" title="بتدوّر على إيه في نقادة؟"
        description="اكتب اسم الخدمة والمكان، أو ابحث عن قرية أو معلومة من الموسوعة." />
      <section className={`shell ${styles.searchArea}`}>
        <form className={styles.searchForm} action="/search" method="get" role="search">
          <label htmlFor="unified-search-input">ما الذي تبحث عنه؟</label>
          <div className={styles.searchRow}>
            <input id="unified-search-input" name="q" defaultValue={query} maxLength={100} autoComplete="off" inputMode="search" placeholder="مثال: صيدلية في الخطارة، دكتور أسنان بشلاو، عبد الرحيم القمولي…" />
            {activeScope !== 'all' ? <input type="hidden" name="scope" value={activeScope} /> : null}
            <button type="submit">ابحث في نقادة</button>
          </div>
          <small>اكتب حرفين على الأقل، وأضف اسم القرية لنتائج أدق. تصحيح الكتابة اقتراح اختياري.</small>
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
                <b>{counts[option.id].toLocaleString(NUMBER_LOCALE)}</b>
              </Link>
            ))}
          </nav>
        ) : null}

        {jobIntent ? <Link className={contextStyles.card} href={jobIntent.href} prefetch={false}><span className={contextStyles.copy}><span className={contextStyles.kicker}>{jobIntent.badge}</span><strong>{jobIntent.title}</strong><small>{jobIntent.subtitle}</small></span><span className={contextStyles.action}>فتح قسم الوظائف ←</span></Link> : null}

        {isWholesaleHomeware && scopedResults.length ? <p role="note">النتائج مرتبطة بالأدوات المنزلية، لكن البيع بالجملة غير مؤكد في بياناتها. تواصل مع النشاط للتأكد من الكميات والأسعار.</p> : null}

        {!canSearch ? (
          <div className={styles.startState}>
            <span className={styles.stateIcon} aria-hidden="true">⌕</span>
            <div><strong>ابدأ باسم خدمة أو مكان أو شخصية</strong><p>اكتب ما تحتاجه بطريقة طبيعية؛ نفس محرك البحث يعمل في الهيدر والصفحة الرئيسية وهنا.</p></div>
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
                  {scopedResults.length.toLocaleString(NUMBER_LOCALE)} نتيجة مطابقة
                  {hasMore ? ` · نعرض أول ${results.length.toLocaleString(NUMBER_LOCALE)} نتيجة حسب الصلة` : ' · معروضة بالكامل حسب الصلة'}
                </small>
              </div>
              <div className={styles.metrics}>
                <span><b>{counts.directory.toLocaleString(NUMBER_LOCALE)}</b><small>أنشطة وأقسام</small></span>
                <span><b>{counts.places.toLocaleString(NUMBER_LOCALE)}</b><small>قرى ومعالم</small></span>
                <span><b>{counts.knowledge.toLocaleString(NUMBER_LOCALE)}</b><small>نتائج موسوعية</small></span>
              </div>
            </div>

            {grouped.length > 1 ? (
              <nav className={styles.groupRail} aria-label="الانتقال بين أنواع النتائج">
                {grouped.map((group) => <a href={`#${group.id}`} key={group.id}>{group.label}<b>{group.items.length.toLocaleString(NUMBER_LOCALE)}</b></a>)}
              </nav>
            ) : null}

            <div className={styles.groups}>
              {grouped.map((group) => (
                <section className={styles.group} id={group.id} key={group.id}>
                  <header className={styles.groupHead}>
                    <div><span>{group.items.length.toLocaleString(NUMBER_LOCALE)} نتيجة معروضة</span><h2>{group.label}</h2><p>{group.description}</p></div>
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
            <div><strong>لا توجد نتائج دقيقة داخل «{activeOption.label}» لعبارة «{query}»</strong><p>{recoverySuggestions.length ? 'وجدنا اقتراحات أكثر احتمالًا مبنية على بيانات الدليل نفسها؛ اختر الاقتراح الذي يعبّر عن قصدك.' : activeScope === 'all' ? 'غيّر العبارة، أو اختار الخدمة أو القرية من دليل الأنشطة.' : 'جرّب «كل النتائج»، أو غيّر العبارة، أو انتقل إلى القسم المناسب يدويًا.'}</p></div>

            {relatedHomeware.length ? <section className={styles.relatedPanel} aria-label="متاجر أدوات منزلية قريبة من العبارة"><h2>متاجر أدوات منزلية قد تفيدك</h2><p>هذه متاجر مرتبطة بالأدوات المنزلية. لم نتحقق من أنها تبيع بالجملة؛ اتصل بالمحل أولًا للتأكد من الكميات والأسعار.</p><div className={styles.resultsGrid}>{relatedHomeware.map((item) => <ResultCard item={item} key={item.href} />)}</div></section> : null}

            {recoverySuggestions.length ? (
              <section className={styles.recoveryPanel} aria-label="اقتراحات لاستعادة البحث">
                <header><span>اقتراحات آمنة</span><strong>هل تقصد أحد هذه الاقتراحات؟</strong><p>لن نطبّق أي اقتراح تلقائيًا؛ افتحه فقط إذا كان هو المقصود.</p></header>
                <div className={styles.recoveryGrid}>
                  {recoverySuggestions.map((suggestion) => (
                    <Link href={searchHref(suggestion.query, activeScope)} key={`${suggestion.reason}-${suggestion.query}`} prefetch={false}>
                      <span>{suggestion.reason}</span>
                      <strong>«{suggestion.query}»</strong>
                      <small>{suggestion.count.toLocaleString(NUMBER_LOCALE)} نتيجة متوقعة</small>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <div className={styles.emptyActions}>
              {activeScope !== 'all' ? <Link href={searchHref(query, 'all')}>عرض كل النتائج</Link> : null}
              <Link href="/directory">فتح دليل الأنشطة</Link>
              <Link href="/knowledge">فتح موسوعة نقادة</Link>
              <Link href={`/contribute?type=missing&name=${encodeURIComponent(query)}`} prefetch={false}>تعرف النشاط؟ ابعت تفاصيله</Link>
            </div>
          </div>
        )}
        {searchJourney ? <details className={styles.exploreMore}>
          <summary>استكشف خدمات وقرى مرتبطة ببحثك</summary>
          <SearchJourneyPanel journey={searchJourney} />
        </details> : searchContext ? (
          <Link className={contextStyles.card} href={searchContext.href} prefetch={false}>
            <span className={contextStyles.copy}><strong>{searchContext.title}</strong><small>{searchContext.subtitle}</small></span>
            <span className={contextStyles.action}>فتح الصفحة المحلية ←</span>
          </Link>
        ) : null}
      </section>
    </main>
  );
}
