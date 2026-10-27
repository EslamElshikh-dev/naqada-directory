import { notFound } from 'next/navigation';
import { ownerActivityId } from '@/lib/activity-path';
import { getPublishedOwnerListing } from '@/lib/owner-listings';
import { socialCard } from '@/lib/social-card';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'بيانات النشاط في دليل نقادة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = ownerActivityId((await params).id);
  const item = id ? await getPublishedOwnerListing(id) : null;
  if (!item) notFound();
  return socialCard(item.name, item.category + ' · ' + item.locality);
}
