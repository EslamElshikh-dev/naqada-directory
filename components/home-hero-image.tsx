import media from '@/lib/home-hero-media.json';
import { getImageProps } from 'next/image';
import { HomeHeroPreloads } from './home-hero-preloads';

const sizes = '(max-width: 760px) calc(100vw - 24px), (max-width: 1100px) 40vw, 480px';
const mobile = '(min-width: 375px) and (max-width: 760px)';
const full = '(max-width: 374px), (min-width: 761px)';
const srcSet = (format: string, crop: string) => media.variants.filter(image => image.format === format && image.crop === crop)
  .map(image => `${image.path} ${image.width}w`).join(', ');
const preloadSrc = (crop: string) => media.variants.find(image => image.format === 'avif' && image.crop === crop && image.width === 750)!.path;
const hints = [
  { href: preloadSrc('mobile'), media: mobile, srcSet: srcSet('avif', 'mobile') },
  { href: preloadSrc('full'), media: full, srcSet: srcSet('avif', 'full') },
] as const;

export function HomeHeroImage() {
  // Preserve Next's responsive JPEG fallback for browsers without either modern
  // format, rather than sending the original 1 MB photograph to those devices.
  const { props: fallback } = getImageProps({
    src: '/images/naqada-home.jpg',
    alt: 'مشهد تعبيري من البيئة الريفية في مركز نقادة بمحافظة قنا',
    fill: true, decoding: 'sync', loading: 'eager', fetchPriority: 'high', sizes,
  });
  return (
    <>
      <HomeHeroPreloads hints={hints} sizes={sizes} />
      <picture>
        <source media={mobile} type="image/avif" srcSet={srcSet('avif', 'mobile')} sizes={sizes} />
        <source media={mobile} type="image/webp" srcSet={srcSet('webp', 'mobile')} sizes={sizes} />
        <source type="image/avif" srcSet={srcSet('avif', 'full')} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet('webp', 'full')} sizes={sizes} />
        {/* Responsive formats are pre-encoded from the same source; bypass on-demand optimization. */}
        <img {...fallback} alt={fallback.alt} />
      </picture>
    </>
  );
}
