import media from '@/lib/home-hero-media.json';
import { getImageProps } from 'next/image';

const sizes = '(max-width: 760px) calc(100vw - 24px), (max-width: 1100px) 40vw, 480px';
const mobile = '(min-width: 375px) and (max-width: 760px)';
const full = '(max-width: 374px), (min-width: 761px)';
const srcSet = (format: string, crop: string) => media.variants.filter(image => image.format === format && image.crop === crop)
  .map(image => `${image.path} ${image.width}w`).join(', ');

export function HomeHeroImage() {
  // Preserve Next's responsive JPEG fallback for browsers without either modern
  // format, rather than sending the original 1 MB photograph to those devices.
  const { props: fallback } = getImageProps({
    src: '/images/naqada-home.jpg',
    alt: 'مشهد تعبيري من البيئة الريفية في مركز نقادة بمحافظة قنا',
    fill: true, loading: 'eager', fetchPriority: 'high', sizes,
  });
  return (
    <>
      <link rel="preload" as="image" type="image/avif" media={mobile} imageSrcSet={srcSet('avif', 'mobile')} imageSizes={sizes} fetchPriority="high" />
      <link rel="preload" as="image" type="image/avif" media={full} imageSrcSet={srcSet('avif', 'full')} imageSizes={sizes} fetchPriority="high" />
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
