import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { roleModels } from '@/lib/role-models';
import { absoluteUrl, siteConfig } from '@/lib/site';
import { getPublicRoleModels } from '@/lib/article-content';
import { getPublicCurated } from '@/lib/auth/moderator';
import { readArticleDocument } from '@/lib/article-document';
import { RoleModelStory } from './story-view';

type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return roleModels.map((person) => ({ slug: person.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = (await getPublicRoleModels()).find(item => item.slug === slug);
  if (!person) return { robots: { index: false, follow: true } };
  const revision = (await getPublicCurated('role_model')).find(row => row.slug === slug);
  const sharing = revision && readArticleDocument(revision.payload)?.sharing;
  const title = person.seoTitle || person.articleTitle || person.name + ' | نماذج مشرفة في نقادة';
  const url = absoluteUrl('/role-models/' + person.slug);
  const socialPhoto = person.photos[person.socialPhotoIndex ?? 0];
  const isMahmoudMemorial = person.slug === 'mahmoud-ahmed-abdel-sabour';
  const socialImage = sharing?.image ? new URL(sharing.image.src, siteConfig.url).toString() : person.socialImage
    ? new URL(person.socialImage.src, siteConfig.url).toString()
    : isMahmoudMemorial
    ? new URL('/images/social/mahmoud-danfiq-share-2026.jpg', siteConfig.url).toString()
    : socialPhoto ? new URL(socialPhoto.src, siteConfig.url).toString() : siteConfig.socialImage;
  const socialImageDetails = sharing?.image ? { width: sharing.image.width, height: sharing.image.height, alt: sharing.image.alt } : person.socialImage
    ? { width: person.socialImage.width, height: person.socialImage.height, alt: person.socialImage.alt }
    : isMahmoudMemorial
    ? { width: 1200, height: 630, alt: 'صور الشهيد محمود أحمد عبد الصبور سعد الثلاث مع عبارة شهيد دنفيق _ فخر نقادة' }
    : { ...(socialPhoto ? { width: socialPhoto.width, height: socialPhoto.height } : {}), alt: socialPhoto?.alt || 'دليل نقادة' };
  return {
    title,
    description: person.description,
    keywords: [...(person.keywords || []), person.name, ...(person.alternateNames || []), 'نماذج مشرفة في نقادة', person.locality, 'مركز نقادة'],
    alternates: { canonical: '/role-models/' + person.slug },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url,
      title: sharing?.title || person.articleTitle || person.name,
      description: sharing?.description || person.description,
      siteName: siteConfig.shortName,
      publishedTime: person.publishedAt,
      modifiedTime: person.modifiedAt,
      images: [{ url: socialImage, ...socialImageDetails }],
    },
    twitter: { card: 'summary_large_image', title: sharing?.title || person.articleTitle || person.name, description: sharing?.description || person.description, images: [{ url: socialImage, alt: socialImageDetails.alt }] },
  };
}

export default async function RoleModelArticle({ params }: Props) {
  const { slug } = await params;
  const person = (await getPublicRoleModels()).find(item => item.slug === slug);
  if (!person) notFound();
  return <RoleModelStory person={person} />;
}
