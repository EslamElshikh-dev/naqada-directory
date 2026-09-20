'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './news-image.module.css';

type NewsImageProps = {
  src: string | null;
  alt: string;
  priority?: boolean;
  sizes: string;
};

function FallbackArtwork() {
  return (
    <span className={styles.fallback} aria-hidden="true">
      <span className={styles.rings} />
      <span className={styles.paper}>
        <i />
        <i />
        <i />
      </span>
      <b>نبض<br />نقادة</b>
    </span>
  );
}

export function NewsImage({ src, alt, priority = false, sizes }: NewsImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <span className={styles.root}>
      {showImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          onError={() => setFailed(true)}
        />
      ) : <FallbackArtwork />}
    </span>
  );
}

