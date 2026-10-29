import Image from 'next/image';
import brandStyles from './brand-mark.module.css';
export function BrandMark({ compact = false, priority = false }: { compact?: boolean; priority?: boolean }) {
  const size = compact ? 30 : 42;
  return (
    <span className={`brand-mark ${brandStyles.mark}${compact ? ` ${brandStyles.compact}` : ''}`} aria-hidden="true">
      <Image src="/icon.svg" width={size} height={size} alt="" loading={priority ? 'eager' : 'lazy'} />
    </span>
  );
}

