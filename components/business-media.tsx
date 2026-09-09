import Image from 'next/image';
import { getBusinessMedia } from '@/lib/business-media';
import { getCategoryMedia } from '@/lib/category-media';
import styles from './business-media.module.css';

export function BusinessMedia({
  businessId,
  variant = 'card',
  fallbackCategory,
}: {
  businessId: string;
  variant?: 'card' | 'detail';
  fallbackCategory?: string;
}) {
  const media = getBusinessMedia(businessId);
  const fallback = fallbackCategory ? getCategoryMedia(fallbackCategory) : null;
  if (!media && !fallback) return null;

  const imageUrl = media?.imageUrl || fallback?.imageUrl || '';
  const imageAlt = media?.imageAlt || '';

  return (
    <figure className={`${styles.media} ${variant === 'detail' ? styles.detail : styles.card}${media ? '' : ` ${styles.illustrative}`}`}>
      <div className={styles.visual}>
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes={variant === 'detail' ? '(max-width: 760px) 92vw, 340px' : '(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 360px'}
          loading="lazy"
          quality={72}
        />
        {!media && <span className={styles.illustrativeBadge}>صورة توضيحية للقسم</span>}
      </div>
      {variant === 'detail' && media && (
        <figcaption className={styles.caption}>
          <span>{media.caption}</span>
          <a href={media.sourceUrl} target="_blank" rel="noreferrer">مصدر الصورة: {media.sourceName} ↗</a>
        </figcaption>
      )}
    </figure>
  );
}
