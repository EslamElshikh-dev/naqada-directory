import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { officialLocalities } from '@/lib/data';
import { getVillageGuide, villageGuides } from '@/lib/village-guides';
import { jsonLdStringify, siteConfig, slugify } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return villageGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getVillageGuide(slug);
  if (!guide) return {};
  const path = `/guides/${guide.slug}`;
  const url = `${siteConfig.url}${path}`;
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    keywords: [guide.focusKeyword, ...guide.secondaryKeywords],
    authors: [{ name: 'فريق دليل نقادة', url: siteConfig.url }],
    alternates: { canonical: path },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url,
      title: guide.metaTitle,
      description: guide.metaDescription,
      siteName: siteConfig.shortName,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
    twitter: {
      card: 'summary',
      title: guide.metaTitle,
      description: guide.metaDescription,
    },
  };
}

export default async function GuideArticlePage({ params }: Props) {
  const { slug } = await params;
  const guide = getVillageGuide(slug);
  if (!guide) notFound();

  const locality = officialLocalities.find((item) => item.name === guide.localityName);
  const localitySlug = locality?.slug || slugify(guide.localityName);
  const canonicalUrl = `${siteConfig.url}/guides/${guide.slug}`;
  const related = villageGuides.filter((item) => item.slug !== guide.slug).slice(0, 3);

  const articleSchema = {
    '@type': 'Article',
    '@id': `${canonicalUrl}#article`,
    headline: guide.title,
    description: guide.metaDescription,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    inLanguage: 'ar-EG',
    author: { '@type': 'Organization', name: 'فريق دليل نقادة', url: siteConfig.url },
    publisher: { '@type': 'Organization', name: siteConfig.shortName, url: siteConfig.url },
    about: {
      '@type': 'Place',
      name: guide.localityName,
      address: { '@type': 'PostalAddress', addressLocality: 'نقادة', addressRegion: 'قنا', addressCountry: 'EG' },
    },
    keywords: [guide.focusKeyword, ...guide.secondaryKeywords].join(', '),
    citation: guide.sources.map((source) => source.url),
  };

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'دليل نقادة', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'أدلة القرى والنجوع', item: `${siteConfig.url}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.localityName, item: canonicalUrl },
    ],
  };

  const structuredData = { '@context': 'https://schema.org', '@graph': [articleSchema, faqSchema, breadcrumbSchema] };

  return (
    <main id="main-content" className="page-main">
      <article>
        <header className="guide-article__hero">
          <div className="shell">
            <nav className="breadcrumbs" aria-label="مسار التنقل">
              <Link href="/">الرئيسية</Link><span>/</span>
              <Link href="/guides">أدلة القرى والنجوع</Link><span>/</span>
              <span>{guide.localityName}</span>
            </nav>
            <span className="eyebrow">{guide.kicker}</span>
            <h1>{guide.title}</h1>
            <p>{guide.excerpt}</p>
            <div className="guide-article__meta">
              <span>نشر: {new Date(guide.publishedAt).toLocaleDateString('ar-EG')}</span>
              <span>آخر تحديث: {new Date(guide.updatedAt).toLocaleDateString('ar-EG')}</span>
              <span>{guide.readingMinutes.toLocaleString('ar-EG')} دقائق قراءة تقريبًا</span>
              <span>الكلمة الرئيسية: {guide.focusKeyword}</span>
            </div>
          </div>
        </header>

        <div className="shell guide-layout">
          <div className="guide-content">
            <p className="guide-lead">هذا المقال جزء من سلسلة دليل نقادة للقرى والنجوع. نستخدم المصادر العامة والمعلومات المؤرخة، ونفرق بين ما هو تاريخي وما هو تحديث حديث؛ لأن الخبر القديم لا يصبح حقيقة أبدية لمجرد أنه ما زال ظاهرًا في Google.</p>

            {guide.sections.map((section, index) => {
              const id = `section-${index + 1}`;
              return (
                <section className="guide-section" id={id} key={section.heading}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
                </section>
              );
            })}

            <section className="guide-faq" id="faq">
              <span className="eyebrow eyebrow--dark">أسئلة مباشرة</span>
              <h2>أسئلة شائعة عن {guide.localityName}</h2>
              {guide.faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>

            <section className="guide-sources" id="sources">
              <span className="eyebrow eyebrow--dark">التحرير والمراجعة</span>
              <h2>المصادر المستخدمة</h2>
              <ol>
                {guide.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a>
                    {source.note && <span className="guide-source-note"> — {source.note}</span>}
                  </li>
                ))}
              </ol>
              <p>المصادر تثبت الوقائع المذكورة في سياقها الزمني. إذا ظهر تحديث رسمي أحدث، نحدّث المقال بدل ترك المعلومة القديمة كأن الزمن وقف عندها.</p>
            </section>
          </div>

          <aside className="guide-aside" aria-label="أدوات المقال">
            <div className="guide-aside__box">
              <h2>داخل المقال</h2>
              <nav className="guide-toc">
                {guide.sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.heading}>{section.heading}</a>)}
                <a href="#faq">الأسئلة الشائعة</a>
                <a href="#sources">المصادر</a>
              </nav>
            </div>
            <div className="guide-aside__box">
              <h2>من المقال إلى الخدمة</h2>
              <div className="guide-aside__actions">
                <Link href={`/villages/${localitySlug}`} className="button button--primary">خدمات {guide.localityName}</Link>
                <Link href="/directory" className="button button--ghost">ابحث في الدليل</Link>
                <Link href={`/contribute?type=missing&locality=${encodeURIComponent(guide.localityName)}`} className="button button--ghost">أضف معلومة أو نشاطًا</Link>
              </div>
            </div>
            <div className="guide-aside__box">
              <h2>مصطلحات البحث</h2>
              <div className="guide-keywords">
                <span>{guide.focusKeyword}</span>
                {guide.secondaryKeywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
              </div>
            </div>
          </aside>
        </div>
      </article>

      <section className="guide-related">
        <div className="shell">
          <span className="eyebrow eyebrow--dark">كمّل الجولة</span>
          <h2>مقالات أخرى من قرى ونجوع نقادة</h2>
          <div className="guide-related__grid">
            {related.map((item) => (
              <Link href={`/guides/${item.slug}`} key={item.slug}>
                <strong>{item.title}</strong>
                <span>{item.readingMinutes.toLocaleString('ar-EG')} دقائق قراءة · {item.localityName}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
