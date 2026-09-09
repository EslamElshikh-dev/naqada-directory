import Image from 'next/image';
import type { CSSProperties } from 'react';
import { getBusinessMedia } from '@/lib/business-media';
import { getCategoryMedia } from '@/lib/category-media';
import styles from './business-media.module.css';

function coverSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

export function BusinessMedia({
  businessId,
  variant = 'card',
  fallbackCategory,
  businessName,
  subcategory,
  locality,
}: {
  businessId: string;
  variant?: 'card' | 'detail';
  fallbackCategory?: string;
  businessName?: string;
  subcategory?: string | null;
  locality?: string | null;
}) {
  const media = getBusinessMedia(businessId);
  const fallback = fallbackCategory ? getCategoryMedia(fallbackCategory) : null;
  if (!media && !fallback) return null;

  const imageUrl = media?.imageUrl || fallback?.imageUrl || '';
  const imageAlt = media?.imageAlt || `تصميم توضيحي مخصص لـ ${businessName || subcategory || fallbackCategory} في ${locality || 'مركز نقادة'}`;
  const seed = coverSeed(businessId);
  const coverStyle = media ? undefined : ({
    '--cover-x': `${30 + (seed % 41)}%`,
    '--cover-y': `${34 + (Math.floor(seed / 41) % 33)}%`,
    '--cover-hue': `${(seed % 9) - 4}deg`,
    '--cover-accent': `hsl(${35 + (seed % 36)} 68% 58%)`,
  } as CSSProperties);
  const isDetail = variant === 'detail';

  return (
    <figure style={coverStyle} className={`${styles.media} ${isDetail ? styles.detail : styles.card}${media ? '' : ` ${styles.illustrative}`}`}>
      <div className={styles.visual}>
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes={isDetail ? '(max-width: 760px) 92vw, 340px' : '(max-width: 760px) 92vw, (max-width: 1100px) 45vw, 360px'}
          loading={isDetail ? 'eager' : 'lazy'}
          fetchPriority={isDetail ? 'high' : 'auto'}
          quality={72}
        />
        {!media && (
          <div className={styles.coverIdentity}>
            {businessName && <span className={styles.coverMark} aria-hidden="true">{businessName.trim().charAt(0)}</span>}
            <span className={styles.coverKicker}>{subcategory || fallbackCategory || 'خدمة محلية'}{locality ? ` · ${locality}` : ''}</span>
            {businessName && <strong>{businessName}</strong>}
            <small>تصميم توضيحي للنشاط</small>
          </div>
        )}
      </div>
      {isDetail && (
        <figcaption className={styles.caption}>
          {media ? <><span>{media.caption}</span><a href={media.sourceUrl} target="_blank" rel="noreferrer">مصدر الصورة: {media.sourceName} ↗</a></> : <span>غلاف مصمم خصيصًا لتمييز هذا النشاط بصريًا، ولا يُقصد به توثيق واجهة المكان.</span>}
        </figcaption>
      )}
    </figure>
  );
}
