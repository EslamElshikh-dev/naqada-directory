import '@/app/content-styles.css';
import { NUMBER_LOCALE } from '@/lib/format-number';
import type { Metadata } from 'next';
import Link from 'next/link';
import { NewsImage } from '@/components/news-image';
import { getArchivedNews } from '@/lib/news';
import { buildPageMetadata, siteConfig } from '@/lib/site';
import styles from './archive.module.css';

export const dynamic = 'force-dynamic';

type ArchiveProps = { searchParams: Promise<{ page?: string | string[] }> };

function archivePage(value?: string | string[]) {
  const raw = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isSafeInteger(raw) && raw >= 1 && raw <= 1000 ? raw : 1;
}

export async function generateMetadata({ searchParams }: ArchiveProps): Promise<Metadata> {
  const page = archivePage((await searchParams).page);
  const canonical = page === 1 ? '/news/archive/' : `/news/archive/?page=${page}`;
  const metadata = buildPageMetadata({
    title: page === 1 ? 'أرشيف أخبار نقادة وقنا' : `أرشيف أخبار نقادة وقنا — الصفحة ${page.toLocaleString(NUMBER_LOCALE)}`,
    description: 'تصفح أخبار نقادة وقنا السابقة وملخصاتها، مع تاريخ النشر واسم الناشر ورابط المصدر الأصلي لكل خبر.',
    path: '/news/archive',
  });

  return {
    ...metadata,
    alternates: { canonical },
    openGraph: { ...metadata.openGraph, url: `${siteConfig.url}${canonical}` },
  };
}

export default async function NewsArchive({ searchParams }: ArchiveProps) {
  const page = archivePage((await searchParams).page);
  const archive = await getArchivedNews(page);
  return <main id="main-content" className={styles.page}>
    <header className={styles.hero}><div className="shell"><nav><Link prefetch={false} href="/">الرئيسية</Link><span> / </span><Link prefetch={false} href="/news">الأخبار</Link><span> / </span>الأرشيف</nav><span>ذاكرة الأخبار المحلية</span><h1>أرشيف أخبار نقادة وقنا</h1><p>أخبار سابقة بالصور وأسماء الناشرين؛ تفاصيل كل خبر ورابطه الأصلي في صفحته.</p></div></header>
    <div className="shell">
      <div className={styles.heading}><h2>الصفحة {page.toLocaleString(NUMBER_LOCALE)}</h2><Link prefetch={false} href="/news">العودة إلى أحدث الأخبار ←</Link></div>
      {archive.items.length ? <div className={styles.grid}>{archive.items.map(item => <article key={item.id} className={styles.card}>
        <Link prefetch={false} href={`/news/${item.id}`} className={styles.media}><NewsImage src={item.imageUrl} alt={item.imageAlt} sizes="(max-width:700px) 100vw, 340px" /></Link>
        <div><small>{item.source} · {item.category} · {item.publishedAt ? new Intl.DateTimeFormat(NUMBER_LOCALE, { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(item.publishedAt)) : 'تاريخ النشر غير متاح'}</small>
          <h3><Link prefetch={false} href={`/news/${item.id}`}>{item.title}</Link></h3><p>{item.description || 'الملخص غير متاح من المصدر.'}</p><Link prefetch={false} className={styles.read} href={`/news/${item.id}`}>معرفة المزيد ←</Link></div>
      </article>)}</div> : <div className={styles.empty}>لا توجد أخبار محفوظة في هذه الصفحة. <Link prefetch={false} href="/news">اطلع على أحدث الأخبار</Link></div>}
      <nav className={styles.pagination} aria-label="صفحات أرشيف الأخبار">{page > 1 && <Link prefetch={false} href={page === 2 ? '/news/archive' : `/news/archive?page=${page - 1}`}>السابق →</Link>}{archive.hasMore && <Link prefetch={false} href={`/news/archive?page=${page + 1}`}>المزيد من الأخبار ←</Link>}</nav>
    </div>
  </main>;
}
