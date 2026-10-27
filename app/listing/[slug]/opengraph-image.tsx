import { notFound } from 'next/navigation';
import { getEffectiveBusiness } from '@/lib/curated-content';
import { socialCard } from '@/lib/social-card';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'بيانات النشاط في دليل نقادة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getEffectiveBusiness(slug);
  if (!item) notFound();
  return socialCard(item.name, [item.category, item.locality].filter(Boolean).join(' · '));
}
