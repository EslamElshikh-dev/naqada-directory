import { notFound } from 'next/navigation';
import { getPublicEditorialPosts } from '@/lib/article-content';
import { getPublicCurated } from '@/lib/auth/moderator';
import { socialCard } from '@/lib/social-card';
export const runtime = 'nodejs';
export const alt = 'عنوان المقال في دليل نقادة';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const revision = (await getPublicCurated('article')).find(item => item.slug === slug);
  if (revision?.status === 'hidden') notFound();
  const item = (await getPublicEditorialPosts()).find(item => item.slug === slug);
  const title = item?.title || (revision?.status === 'published' ? revision.payload.title : '');
  if (!title) notFound();
  return socialCard(title, item?.description || revision?.payload.summary || 'مقالات نقادة وقراها ونجوعها');
}
