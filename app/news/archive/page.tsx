import type { Metadata } from 'next';
import Link from 'next/link';
import { NewsImage } from '@/components/news-image';
import { getArchivedNews } from '@/lib/news';
import styles from './archive.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'أرشيف أخبار نقادة وقنا | دليل نقادة', description: 'تصفح عناوين الأخبار السابقة وملخصاتها، مع مصدر كل خبر ورابطه الأصلي.' };

export default async function NewsArchive({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const raw = Number(params.page);
  const page = Number.isSafeInteger(raw) && raw >= 1 && raw <= 1000 ? raw : 1;
  const archive = await getArchivedNews(page);
  return <main id="main-content" className={styles.page}>
    <header className={styles.hero}><div className="shell"><nav><Link href="/">الرئيسية</Link><span> / </span><Link href="/news">الأخبار</Link><span> / </span>الأرشيف</nav><span>ذاكرة الأخبار المحلية</span><h1>أرشيف الأخبار</h1><p>ملخصات وروابط للأخبار التي وصلت للدليل؛ يظل اسم الناشر ورابط الخبر الأصلي واضحين في كل بطاقة.</p></div></header>
    <div className="shell">
      <div className={styles.heading}><h2>الصفحة {page.toLocaleString('ar-EG')}</h2><Link href="/news">العودة إلى أحدث الأخبار ←</Link></div>
      {archive.items.length ? <div className={styles.grid}>{archive.items.map(item => <article key={item.id} className={styles.card}>
        <Link href={`/news/${item.id}`} className={styles.media}><NewsImage src={item.imageUrl} alt={item.imageAlt} sizes="(max-width:700px) 100vw, 340px" /></Link>
        <div><small>{item.source} · {item.category} · {item.publishedAt ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(item.publishedAt)) : 'تاريخ النشر غير متاح'}</small>
          <h3><Link href={`/news/${item.id}`}>{item.title}</Link></h3><p>{item.description || 'الملخص غير متاح من المصدر.'}</p><Link className={styles.read} href={`/news/${item.id}`}>الملخص والمصدر ←</Link></div>
      </article>)}</div> : <div className={styles.empty}>لا توجد أخبار محفوظة في هذه الصفحة. <Link href="/news">اطلع على أحدث الأخبار</Link></div>}
      <nav className={styles.pagination} aria-label="صفحات أرشيف الأخبار">{page > 1 && <Link href={page === 2 ? '/news/archive' : `/news/archive?page=${page - 1}`}>السابق →</Link>}{archive.hasMore && <Link href={`/news/archive?page=${page + 1}`}>المزيد من الأخبار ←</Link>}</nav>
    </div>
  </main>;
}
