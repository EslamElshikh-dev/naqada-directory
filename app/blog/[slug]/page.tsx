import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { editorialImagePath } from '@/lib/editorial-image-path';
import { getPublicCurated } from '@/lib/auth/moderator';
import { getPublicEditorialPosts } from '@/lib/article-content';
import { readArticleDocument } from '@/lib/article-document';
import { CuratedArticle } from './curated-article';
import { siteConfig } from '@/lib/site';
import { villageArticleAuthor } from '@/lib/village-articles';
import { EditorialPostArticle } from './article-view';

type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return allEditorialPosts.map((post) => ({ slug: post.slug }));
}

function imageUrl(asset: string) {
  return `${siteConfig.url}${editorialImagePath(asset)}`;
}

function metadataTitle(title: string) {
  return title.replace(/\s*\|\s*دليل نقادة\s*$/u, '').trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const revision = (await getPublicCurated('article')).find((item) => item.slug === slug);
  if (revision?.status === 'hidden') return { robots: { index: false, follow: false } };
  if (revision?.origin === 'original' && revision.status === 'published' && !readArticleDocument(revision.payload)) {
    return {
      title: revision.payload.title, description: revision.payload.summary,
      alternates: { canonical: `/blog/${slug}` },
      openGraph: { type: 'article', title: revision.payload.title,
        description: revision.payload.summary, publishedTime: revision.updatedAt },
    };
  }
  const post = (await getPublicEditorialPosts()).find(item => item.slug === slug);
  if (!post) return {};
  const url = `${siteConfig.url}/blog/${post.slug}`;
  const sharing = revision && readArticleDocument(revision.payload)?.sharing;
  const hero = sharing?.image ? new URL(sharing.image.src, siteConfig.url).toString() : imageUrl(post.hero.asset);
  const sharedTitle = sharing?.title || post.title;
  const sharedDescription = sharing?.description || post.description;

  return {
    title: metadataTitle(post.seoTitle || post.title),
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.authorName || villageArticleAuthor.name, ...((post.authorUrl || !post.authorName || post.authorName === villageArticleAuthor.name) ? { url: new URL(post.authorUrl || villageArticleAuthor.href, siteConfig.url).toString() } : {}) }],
    alternates: { canonical: `/blog/${post.slug}` },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url,
      title: sharedTitle,
      description: sharedDescription,
      siteName: siteConfig.shortName,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [(post.authorName || villageArticleAuthor.name)],
      images: [{ url: hero, width: sharing?.image?.width || post.hero.width, height: sharing?.image?.height || post.hero.height, alt: sharing?.image?.alt || post.hero.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: sharedTitle,
      description: sharedDescription,
      images: [hero],
    },
  };
}

export default async function EditorialPostPage({ params }: Props) {
  const { slug } = await params;
  const revision = (await getPublicCurated('article')).find((item) => item.slug === slug);
  if (revision?.status === 'hidden') notFound();
  if (revision?.status === 'published' && (!readArticleDocument(revision.payload) && (revision.origin === 'original' || revision.payload.body?.trim()))) {
    return <CuratedArticle slug={slug} title={revision.payload.title} summary={revision.payload.summary} body={revision.payload.body} updatedAt={revision.updatedAt} />;
  }
  const post = (await getPublicEditorialPosts()).find(item => item.slug === slug);
  if (!post) notFound();
  return <EditorialPostArticle post={post} />;
}
