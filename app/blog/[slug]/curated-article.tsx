import Link from 'next/link';
import { jsonLdStringify, siteConfig } from '@/lib/site';
import styles from './curated-article.module.css';

export function CuratedArticle({ slug, title, summary, body, updatedAt }: {
  slug: string; title: string; summary: string; body: string; updatedAt: string;
}) {
  const url = `${siteConfig.url}/blog/${encodeURIComponent(slug)}`;
  const schema = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: title, description: summary, mainEntityOfPage: url,
    datePublished: updatedAt, dateModified: updatedAt, inLanguage: 'ar-EG',
    author: { '@type': 'Organization', name: 'فريق دليل نقادة' },
    publisher: { '@type': 'Organization', name: siteConfig.shortName, url: siteConfig.url },
  };
  return (
    <main id="main-content" className={styles.page}>
      <article className={styles.article}>
        <nav aria-label="مسار المقال"><Link href="/">الرئيسية</Link><span>/</span><Link href="/blog">المدونة</Link><span>/</span><span>{title}</span></nav>
        <header><span>من مدونة دليل نقادة</span><h1>{title}</h1><p>{summary}</p><div><b>فريق دليل نقادة</b><time dateTime={updatedAt}>{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }).format(new Date(updatedAt))}</time></div></header>
        <div className={styles.body}>{body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <footer><Link href="/blog">← كل مقالات الدليل</Link></footer>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(schema) }} />
    </main>
  );
}
