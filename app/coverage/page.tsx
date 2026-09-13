import type { Metadata } from 'next';
import Link from 'next/link';
import { businesses, canonicalLocalityName, categories, officialLocalities } from '@/lib/data';
import { MIN_LOCAL_CATEGORY_RESULTS, localCategoryHref, localCategoryResultCount } from '@/lib/discovery-routing';
import { buildPageMetadata, jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'خريطة تغطية دليل نقادة',
  description: 'استكشف تغطية الأنشطة والخدمات في قرى ونجوع مركز نقادة عبر مسارات مباشرة للمكان والتصنيف، وتعرف على الفئات التي تحتاج استكمالًا أو مصادر إضافية.',
  path: '/coverage',
});

const primaryCategoryNames = [
  'الطب والصحة',
  'التجزئة والتسوق',
  'التعليم',
  'المطاعم والأطعمة',
  'البناء والصيانة',
  'السيارات والنقل',
  'الإلكترونيات والهواتف',
  'الخدمات المهنية',
];

export default function CoveragePage() {
  const primaryCategories = primaryCategoryNames
    .map((name) => categories.find((item) => item.name === name))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const coverage = officialLocalities.map((locality) => {
    const items = businesses.filter((item) => canonicalLocalityName(item.locality) === locality.name);
    const represented = new Set(items.map((item) => item.category));
    const missing = primaryCategories.filter((category) => !represented.has(category.name));
    const routes = categories
      .map((category) => {
        const count = localCategoryResultCount(category.name, locality.name);
        return {
          category,
          count,
          href: localCategoryHref(category.name, locality.name),
        };
      })
      .filter((route) => route.count >= MIN_LOCAL_CATEGORY_RESULTS)
      .sort((a, b) => b.count - a.count || a.category.name.localeCompare(b.category.name, 'ar'));

    return { locality, items, represented, missing, routes };
  });

  const active = coverage.filter((item) => item.items.length > 0);
  const strongest = [...active].sort((a, b) => b.items.length - a.items.length).slice(0, 12);
  const crawlable = [...active]
    .filter((item) => item.routes.length > 0)
    .sort((a, b) => b.routes.length - a.routes.length || b.items.length - a.items.length);
  const needsCoverage = [...coverage]
    .filter((item) => item.missing.length > 0)
    .sort((a, b) => a.items.length - b.items.length || b.missing.length - a.missing.length)
    .slice(0, 18);
  const mapLinked = businesses.filter((item) => Boolean(item.mapsUrl)).length;
  const canonicalRouteCount = active.reduce((sum, item) => sum + item.routes.length, 0);
  const pageUrl = `${siteConfig.url}/coverage`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'خريطة تغطية دليل نقادة',
        url: pageUrl,
        description: 'مؤشر شفاف لتوزيع السجلات المنشورة داخل دليل نقادة ومسارات الخدمات المحلية الثابتة والفئات التي تحتاج استكمالًا.',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: strongest.length,
          itemListElement: strongest.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.locality.name,
            url: `${siteConfig.url}/villages/${encodeURIComponent(item.locality.slug)}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'خريطة التغطية', item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="about-hero">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><span>خريطة التغطية</span></nav>
          <span className="eyebrow">شفافية البيانات + وصول مباشر</span>
          <h1>أين يغطي الدليل جيدًا… وكيف تصل إلى <em>الخدمة داخل المكان؟</em></h1>
          <p>هذه الصفحة تقيس ما هو ممثل داخل قاعدة دليل نقادة فقط، وتفتح مسارات مباشرة للخدمات التي لديها تغطية كافية. غياب فئة عن موضع هنا لا يعني أنها غير موجودة على أرض الواقع؛ بل يعني أننا لم ننشر لها سجلًا مؤكدًا بعد.</p>
          <div className="hero-inline-stats">
            <span><b>{businesses.length.toLocaleString('ar-EG')}</b> سجلًا منشورًا</span>
            <span><b>{active.length.toLocaleString('ar-EG')}</b> موضعًا به بيانات</span>
            <span><b>{canonicalRouteCount.toLocaleString('ar-EG')}</b> مسار خدمة ثابتًا</span>
            <span><b>{mapLinked.toLocaleString('ar-EG')}</b> سجلًا له رابط خريطة</span>
          </div>
        </div>
      </section>

      {crawlable.length ? (
        <section className="section section--muted">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="eyebrow eyebrow--dark">مسارات مباشرة</span>
                <h2>الخدمة والمكان في صفحة ثابتة واحدة</h2>
                <p>نُظهر هنا فقط التركيبات التي لديها {MIN_LOCAL_CATEGORY_RESULTS.toLocaleString('ar-EG')} سجلات منشورة على الأقل، لذلك كل رابط يقود إلى صفحة محلية ثابتة بدل رابط بحث مؤقت.</p>
              </div>
              <Link href="/directory" className="text-link">استكشف كل الخدمات ←</Link>
            </div>
            <div className="principles-grid">
              {crawlable.slice(0, 24).map(({ locality, items, routes }) => (
                <article key={locality.slug} style={{ minWidth: 0 }}>
                  <b>{routes.length.toLocaleString('ar-EG')}</b>
                  <h3><Link href={`/villages/${locality.slug}`}>{locality.name}</Link></h3>
                  <p>{items.length.toLocaleString('ar-EG')} سجلًا منشورًا · {routes.length.toLocaleString('ar-EG')} مسار خدمة ثابتًا.</p>
                  <div className="category-pills" aria-label={`مسارات خدمات ثابتة في ${locality.name}`}>
                    {routes.slice(0, 6).map((route) => (
                      <Link key={route.category.slug} href={route.href}>
                        {route.category.shortLabel} · {route.count.toLocaleString('ar-EG')}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section shell">
        <div className="section-heading"><div><span className="eyebrow eyebrow--dark">أقوى التغطيات الحالية</span><h2>المواضع الأكثر تمثيلًا في قاعدة الدليل</h2><p>الترتيب هنا حسب عدد السجلات المنشورة، وليس حسب حجم القرية أو عدد الأنشطة الحقيقي.</p></div><Link href="/villages" className="text-link">كل القرى والنجوع ←</Link></div>
        <div className="place-list">
          {strongest.map((item, index) => <Link key={item.locality.slug} href={`/villages/${item.locality.slug}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.locality.name}</strong><small>{item.represented.size.toLocaleString('ar-EG')} قسمًا ممثلًا</small></div><b>{item.items.length.toLocaleString('ar-EG')} سجلًا</b></Link>)}
        </div>
      </section>

      <section className="section section--muted">
        <div className="shell">
          <div className="section-heading"><div><span className="eyebrow eyebrow--dark">فرص الاستكمال</span><h2>فئات شائعة غير ممثلة بعد في بعض المواضع</h2><p>استخدم هذه القائمة كخريطة عمل لجمع بيانات حقيقية. كل زر يجهز مساهمة بالموضع والتصنيف تلقائيًا.</p></div><Link href="/contribute" className="text-link">إضافة نشاط أو تصحيح بيانات ←</Link></div>
          <div className="principles-grid">
            {needsCoverage.map(({ locality, items, missing }) => (
              <article key={locality.slug} style={{ minWidth: 0 }}>
                <b>{items.length.toLocaleString('ar-EG')}</b>
                <h3>{locality.name}</h3>
                <p>{items.length ? `يوجد ${items.length.toLocaleString('ar-EG')} سجلًا منشورًا حاليًا.` : 'لا توجد أنشطة منشورة لهذا الموضع حتى الآن.'}</p>
                <div className="category-pills" aria-label={`فئات تحتاج استكمالًا في ${locality.name}`}>
                  {missing.slice(0, 4).map((category) => <Link key={category.slug} href={`/contribute?type=missing&name=${encodeURIComponent(category.shortLabel)}&category=${encodeURIComponent(category.name)}&locality=${encodeURIComponent(locality.name)}`}>{category.shortLabel}</Link>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell methodology">
        <div><span className="eyebrow eyebrow--dark">طريقة القراءة</span><h2>لا نحول نقص البيانات إلى ادعاء</h2><p>خريطة التغطية أداة لتحسين قاعدة الدليل وليس تقييمًا للقرى أو الخدمات الموجودة فعليًا. أي إضافة تمر بمراجعة المصدر قبل النشر.</p><Link href="/about" className="text-link">منهجية الدليل ←</Link></div>
        <div className="methodology__grid">
          <article><b>01</b><h3>تمثيل لا حصر</h3><p>العدد يعكس السجلات المنشورة عندنا فقط، لا العدد الواقعي للأنشطة.</p></article>
          <article><b>02</b><h3>مسارات لها حد أدنى</h3><p>لا يظهر مسار خدمة محلي ثابت إلا عندما توجد بيانات منشورة كافية له داخل الموضع.</p></article>
          <article><b>03</b><h3>المصدر أولًا</h3><p>اقتراح النشاط لا يعني نشره حتى يوجد ما يكفي لتثبيت البيانات العامة.</p></article>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
