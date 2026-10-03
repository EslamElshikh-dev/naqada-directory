import Image from 'next/image';
import { CategoryVisual } from './category-visual';
import styles from './listing-cover.module.css';

export function ListingCover({ src, name, category, locality, detail = false }: {
  src?: string | null; name: string; category: string; locality?: string | null; detail?: boolean;
}) {
  return <div className={`${styles.cover} ${detail ? styles.detail : ''}`}>
    {src ? <Image src={src} alt={`غلاف نشاط ${name} من صاحب النشاط`} fill unoptimized
      sizes={detail ? '(max-width: 760px) 92vw, 560px' : '(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 380px'}
      loading={detail ? 'eager' : 'lazy'} fetchPriority={detail ? 'high' : 'auto'} />
      : <div className={styles.symbolic}>
        <CategoryVisual category={category} size="lg" />
        <span className={styles.category}>{category}{locality ? ` · ${locality}` : ''}</span>
        <strong>{name}</strong>
        <small>غلاف رمزي للنشاط</small>
      </div>}
    <span className={styles.caption}>{src ? 'من صاحب النشاط' : 'دليل نقادة'}</span>
  </div>;
}
