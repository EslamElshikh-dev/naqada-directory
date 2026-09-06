'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import type { MemberFrameCode } from '@/lib/member-reputation';
import styles from './member-avatar.module.css';

type Props = {
  name: string;
  src?: string | null;
  frame?: MemberFrameCode;
  size?: number;
  badge?: string | null;
  compact?: boolean;
  priority?: boolean;
};

export function MemberAvatar({ name, src, frame = 'gray', size = 72, badge, compact = false, priority = false }: Props) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0) || 'ع';
  const showImage = Boolean(src && !failed);
  const style = { '--avatar-size': `${size}px` } as CSSProperties;

  return (
    <span className={`${styles.avatarShell} ${styles[frame]} ${compact ? styles.compact : ''}`} style={style}>
      <span className={styles.ring}>
        <span className={styles.inner} aria-label={`صورة حساب ${name}`}>
          {showImage ? (
            <Image
              src={src!}
              alt=""
              fill
              sizes={`${size}px`}
              priority={priority}
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
            />
          ) : <b>{initial}</b>}
        </span>
      </span>
      {badge && !compact ? <small className={styles.badge}>{badge}</small> : null}
    </span>
  );
}
