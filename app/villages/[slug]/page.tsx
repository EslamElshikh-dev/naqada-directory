import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { BrandMark } from '@/components/site-shell';
import { businesses, canonicalLocalityName, categories, directoryBusinesses, getLocalityBySlug, localities } from '@/lib/data';
import { buildPageMetadata, isSafeExternalUrl, jsonLdStringify, siteConfig } from '@/lib/site';
import { getVillageArticle, villageArticleAuthor } from '@/lib/village-articles';
import styles from './article.module.css';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return localities.map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locality = getLocalityBySlug(slug);
  if (!locality) return {};
  const article = getVillageArticle(locality.name);
  const path = `/villages/${locality.slug}`;

  if (article) {
    return buildPageMetadata({
      title: article.seoTitle,
      description: article.description,
      path,
    });
  }

  const description = `الخدمات والأنشطة المنشورة في ${locality.name} ضمن مركز نقادة بمحافظة قنا، مع معلومات الموضع وروابط الوصول.`;
  return buildPageMetadata({
    title: `دليل ${locality.name} — مركز نقادة`,
    description,
    path,
    robots: locality.businessCount > 0 ? { index: true, follow: true } : { index: false, follow: true },
  });
}

export default async function LocalityPage({ params }: Props) {
  const { slug } = await params;
  const locality = getLocalityBySlug(slug);
  if (!locality) notFound();
  const article = getVillageArticle(locality.name);
  const scoped = businesses.filter((item) => canonicalLocalityName(item.locality) === locality.name);
  const scopedDirectory = directoryBusinesses.filter((item) => canonicalLocalityName(item.locality) === locality.name);
  const categoryCount = new Set(scoped.map((item) => item.category)).size;
  const categoryCounts = new Map<string, number>();
  for (const item of scoped) categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1);
  const topCategories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ category: categories.find((item) => item.name === name), count }))
    .filter((item): item is { category: NonNullable<typeof item.category>; count: number } => Boolean(item.category))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const relatedPlaces = article
    ? localities.filter((item) => article.relatedLocalities.some((name) => item.name === name || getVillageArticle(item.name)?.locality === name)).slice(0, 6)
    : [];
  const canonicalUrl = `${siteConfig.url}/villages/${encodeURIComponent(locality.slug)}`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Place',
      '@id': `${canonicalUrl}#place`,
      name: locality.name,
      containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز نقادة، قنا، مصر' },
      url: canonicalUrl,
    },
    {
      '@type': 'ItemList',
      numberOfItems: scoped.length,
      itemListElement: scoped.slice(0, 20).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
        { '@type': 'ListItem', position: 2, name: 'القرى والنجوع', item: `${siteConfig.url}/villages` },
        { '@type': 'ListItem', position: 3, name: locality.name, item: canonicalUrl },
      ],
    },
  ];

  if (article) {
    graph.push(
      {
        '@type': 'Article',
        '@id': `${canonicalUrl}#article`,
        headline: article.title,
        description: article.description,
        keywords: article.keywords.join(', '),
        inLanguage: 'ar-EG',
        datePublished: article.publishedAt,
        dateModified: article.modifiedAt,
        mainEntityOfPage: canonicalUrl,
        about: { '@id': `${canonicalUrl}#place` },
        author: {
          '@type': 'Person',
          name: villageArticleAuthor.name,
          url: `${siteConfig.url}${villageArticleAuthor.href}`,
        },
        publisher: {
          '@type': 'Organization',
          name: siteConfig.shortName,
          url: siteConfig.url,
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: article.faqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    );
  }

  const structuredData = { '@context': 'https://schema.org', '@graph': graph };

  return (
    <main id="main-content" className="page-main">
      <section className="village-hero">
        <div className="shell village-hero__grid">
          <div>
            <nav className="breadcrumbs"><Link href="/villages">القرى والنجوع</Link><span>/</span><span>{locality.name}</span></nav>
            <div className="village-hero__identity">
              <BrandMark />
              <div><span className="eyebrow">{article ? 'حكاية محلية من مركز نقادة' : `${locality.type} ضمن نطاق مركز نقادة`}</span><small>{locality.classification}</small></div>
            </div>
            <h1>{article?.title || locality.name}</h1>
            <p>{article?.intro[0] || locality.notes || locality.scope || 'موضع محلي ضمن مركز نقادة بمحافظة قنا.'}</p>
            <div className="detail-actions">
              {article ? <a href="#village-article" className="button button--light">اقرأ حكاية المكان</a> : <a href="#locality-listings" className="button button--light">عرض الأنشطة</a>}
              <a href="#locality-listings" className="button button--outline-light">الخدمات والأنشطة</a>
            </div>
          </div>
          <aside className="village-hero__summary">
            <span>ملخص الموضع</span>
            <div className="catalog-hero__metrics">
              <span><b>{scoped.length.toLocaleString('ar-EG')}</b><small>سجلًا منشورًا</small></span>
              <span><b>{categoryCount.toLocaleString('ar-EG')}</b><small>قسمًا متاحًا</small></span>
              <span><b>{locality.verification || 'مراجع'}</b><small>حالة الإدراج</small></span>
            </div>
            {isSafeExternalUrl(locality.source) && <a href={locality.source || '#'} target="_blank" rel="noreferrer">مصدر الموضع ↗</a>}
          </aside>
        </div>
      </section>

      <section className={`shell page-section ${article ? styles.articleWrap : ''}`}>
        <div className="locality-summary">
          <div><span>النوع</span><strong>{locality.type}</strong></div>
          <div><span>النطاق الإداري</span><strong>{locality.center || 'مركز نقادة'}</strong></div>
          <div><span>التصنيف</span><strong>{locality.classification || 'موضع محلي'}</strong></div>
        </div>

        {article && (
          <article id="village-article" className={styles.article}>
            <div className={styles.metaRow}>
              <span>دليل القرية والنجع</span>
              <time dateTime={article.modifiedAt}>آخر تحديث: ٤ سبتمبر ٢٠٢٦</time>
              <span>قراءة محلية موثقة</span>
            </div>

            {article.intro.slice(1).length > 0 && (
              <div className={styles.lead}>
                {article.intro.slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            )}

            {article.sections.map((section, index) => (
              <section key={section.heading} id={`article-section-${index + 1}`} className={styles.section}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}

            {relatedPlaces.length > 0 && (
              <nav className={styles.related} aria-label={`أماكن مرتبطة بـ ${locality.name}`}>
                <span>اقرأ أيضًا عن أماكن قريبة ومرتبطة</span>
                <div className={styles.relatedLinks}>
                  {relatedPlaces.map((place) => <Link key={place.slug} href={`/villages/${place.slug}`}>{place.name}</Link>)}
                </div>
              </nav>
            )}

            <div className={styles.directoryBridge}>
              <div>
                <span>من الحكاية إلى الحاجة اليومية</span>
                <strong>تبحث عن خدمة في {locality.name}؟</strong>
                <p>ستجد أسفل المقال الأنشطة المنشورة لهذا الموضع، ويمكنك توسيع البحث لبقية مركز نقادة حسب نوع الخدمة.</p>
              </div>
              <a href="#locality-listings">عرض الخدمات ↓</a>
            </div>

            <section className={styles.faq} aria-labelledby="faq-title">
              <h2 id="faq-title">أسئلة شائعة عن {locality.name}</h2>
              <p>إجابات مباشرة على أكثر الأسئلة التي تساعد في فهم المكان والبحث عنه.</p>
              <div className={styles.faqGrid}>
                {article.faqs.map((item, index) => (
                  <details key={item.question} className={styles.faqItem} open={index === 0}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>

            <footer className={styles.authorCard}>
              <div className={styles.authorMark} aria-hidden="true">إش</div>
              <div className={styles.authorCopy}>
                <span>كتب وحرّر هذا المقال</span>
                <strong>{villageArticleAuthor.name}</strong>
                <small>{villageArticleAuthor.role}</small>
                <p>{villageArticleAuthor.bio}</p>
                <Link href={villageArticleAuthor.href}>عن دليل نقادة والكاتب ←</Link>
              </div>
            </footer>
          </article>
        )}
      </section>

      <section id="locality-listings" className="shell page-section">
        {topCategories.length > 0 && (
          <div className="category-pills" aria-label={`أشهر أقسام ${locality.name}`}>
            {topCategories.map(({ category, count }) => <Link key={category.slug} href={count >= 3 ? `/villages/${locality.slug}/${category.slug}` : `/directory/${category.slug}?locality=${encodeURIComponent(locality.name)}`}>{category.shortLabel} <small>{count.toLocaleString('ar-EG')}</small></Link>)}
          </div>
        )}
        {scoped.length ? (
          <Suspense fallback={<div className="loading-state">جارٍ تجهيز الأنشطة…</div>}>
            <DirectoryExplorer businesses={scopedDirectory} categories={categories} localities={localities} initialLocality={locality.name} lockedLocality />
          </Suspense>
        ) : (
          <div className="empty-state">
            <strong>لم تُنشر أنشطة مؤكدة لهذا الموضع بعد</strong>
            <p>{article ? 'المقال متاح للفهرسة والقراءة، وسيُضاف إليه كتالوج الخدمات فور توفر بيانات منشورة كافية.' : 'الموضع موجود في الهيكل الجغرافي، لكنه غير مفهرس كصفحة نتائج حتى تتوفر له بيانات منشورة كافية.'}</p>
            <Link href="/directory" className="button button--primary">فتح الدليل الشامل</Link>
          </div>
        )}
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
