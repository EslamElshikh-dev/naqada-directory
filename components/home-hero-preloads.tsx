'use client';

type HeroHint = { href: string; media: string; srcSet: string };

// SSR hoists these links into head. Keeping only the hints behind a client
// boundary avoids Flight's automatic preload hint, which drops image media.
export function HomeHeroPreloads({ hints, sizes }: { hints: readonly HeroHint[]; sizes: string }) {
  return <>{hints.map(hint => <link key={hint.href} rel="preload" href={hint.href} as="image"
    type="image/avif" media={hint.media} imageSrcSet={hint.srcSet} imageSizes={sizes} fetchPriority="high" />)}</>;
}
