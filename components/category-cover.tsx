import Image from 'next/image';
import { getCategoryMedia } from '@/lib/category-media';
import { CategoryVisual } from './category-visual';
import styles from './category-cover.module.css';

export function CategoryCover({ category, index }: { category: string; index: number }) {
  const media = getCategoryMedia(category);
  return (
    <div className={styles.cover}>
      <Image
        src={media.imageUrl}
        alt={media.imageAlt}
        fill
        sizes="(max-width: 760px) 50vw, (max-width: 1180px) 33vw, 25vw"
        quality={72}
      />
      <div className={styles.overlay}>
        <CategoryVisual category={category} size="sm" />
        <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
