'use client';

import Image, { type ImageProps } from 'next/image';
import { ownerPhotoLoader } from '@/lib/owner-photo-delivery';

type OwnerPhotoProps = Omit<ImageProps, 'loader' | 'unoptimized' | 'src'> & { src: string };

export function OwnerPhoto({ src, alt, ...props }: OwnerPhotoProps) {
  return <Image {...props} src={src} alt={alt} loader={ownerPhotoLoader} />;
}
