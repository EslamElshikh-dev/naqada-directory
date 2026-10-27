import { notFound } from 'next/navigation';
import { localities } from '@/lib/data';
import { socialCard } from '@/lib/social-card';
export const runtime = 'nodejs';
export const alt = 'القرية وخدماتها في دليل نقادة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = localities.find(item => item.slug === slug);
  if (!item) notFound();
  return socialCard(item.name, 'الخدمات والأنشطة والمعلومات المنشورة في مركز نقادة بمحافظة قنا');
}
