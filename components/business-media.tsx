import Image from 'next/image';
import { getBusinessMedia } from '@/lib/business-media';
import styles from './business-media.module.css';

export function BusinessMedia({
  businessId,
  variant = 'card',
}: {
  businessId: string;
  variant?: 'card' | 'detail';
}) {
  const media = getBusinessMedia(businessId);
  if (!media) return null;

  return (
    <figure className={`${styles.media} ${variant === 'detail' ? styles.detail : styles.card}`}>
      <div className={styles.visual}>
        <Image
          src={media.imageUrl}
          alt={media.imageAlt}
          fill
          sizes={variant === 'detail' ? '(max-width: 760px) 92vw, 340px' : '(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 360px'}
          loading="lazy"
        />
      </div>
      {variant === 'detail' && (
        <figcaption className={styles.caption}>
          <span>{media.caption}</span>
          <a href={media.sourceUrl} target="_blank" rel="noreferrer">مصدر الصورة: {media.sourceName} ↗</a>
        </figcaption>
      )}
    </figure>
  );
}
