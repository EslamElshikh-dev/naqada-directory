import { cache } from 'react';
import { allEditorialPosts } from './editorial-posts-all';
import { roleModels } from './role-models';
import type { EditorialPost } from './editorial-posts';
import type { RoleModel } from './role-models';
import { getEditorContent, getPublicCurated, type CuratedRecord } from './auth/moderator';
import { readArticleDocument, type ArticleDocument, type ArticleKind } from './article-document';
import { villageArticleAuthor } from './village-articles';
import { siteConfig } from './site';

export function editorialDocument(post: EditorialPost): ArticleDocument {
  return { format: 'editorial', content: { authorName: villageArticleAuthor.name, authorUrl: new URL(villageArticleAuthor.href, siteConfig.url).toString(), authorRole: villageArticleAuthor.role, authorBio: villageArticleAuthor.bio, ...post }, sharing: { title: '', description: '' } };
}
export function roleModelDocument(person: RoleModel): ArticleDocument { return { format: 'role_model', content: person, sharing: { title: '', description: '' } }; }

export function applyEditorialRevision(post: EditorialPost, row?: CuratedRecord): EditorialPost {
  if (row?.status !== 'published') return post;
  const doc = readArticleDocument(row.payload);
  if (doc?.format === 'editorial') return { ...doc.content, modifiedAt: row.updatedAt.slice(0, 10) };
  return { ...post, title: row.payload.title || post.title, description: row.payload.summary || post.description, excerpt: row.payload.summary || post.excerpt, modifiedAt: row.updatedAt.slice(0, 10) };
}

export const getPublicEditorialPosts = cache(async () => {
  const records = await getPublicCurated('article');
  const changes = new Map(records.map(row => [row.slug, row]));
  const posts = allEditorialPosts.filter(post => changes.get(post.slug)?.status !== 'hidden').map(post => applyEditorialRevision(post, changes.get(post.slug)));
  for (const row of records) {
    if (row.origin !== 'original' || row.status !== 'published') continue;
    const doc = readArticleDocument(row.payload);
    if (doc?.format === 'editorial') posts.push({ ...doc.content, modifiedAt: row.updatedAt.slice(0, 10) });
  }
  return posts;
});

export const getPublicRoleModels = cache(async () => {
  const records = await getPublicCurated('role_model');
  const changes = new Map(records.map(row => [row.slug, row]));
  const people = roleModels.filter(person => changes.get(person.slug)?.status !== 'hidden').map(person => {
    const row = changes.get(person.slug);
    const doc = row?.status === 'published' ? readArticleDocument(row.payload) : null;
    return doc?.format === 'role_model' ? { ...doc.content, modifiedAt: row!.updatedAt.slice(0, 10) } : person;
  });
  for (const row of records) {
    if (row.origin !== 'original' || row.status !== 'published') continue;
    const doc = readArticleDocument(row.payload);
    if (doc?.format === 'role_model') people.push({ ...doc.content, modifiedAt: row.updatedAt.slice(0, 10) });
  }
  return people;
});

export async function getEditorArticle(token: string, kind: ArticleKind, slug?: string, authorName?: string) {
  if (!slug) {
    const post: EditorialPost = { slug: '', title: '', seoTitle: '', description: '', locality: '', category: '', keywords: [], excerpt: '', hero: { asset: '', alt: '', caption: '', width: 1200, height: 675 }, intro: [], sections: [], faqs: [], sources: [], relatedVillage: '', publishedAt: new Date().toISOString().slice(0, 10), modifiedAt: new Date().toISOString().slice(0, 10) };
    return { document: editorialDocument({ ...post, ...(authorName ? { authorName, authorUrl: '', authorRole: '', authorBio: '' } : {}) }), slug: '', origin: 'original' as const, status: 'draft', version: null };
  }
  const records = await getEditorContent(token);
  const row = records.find(item => item.kind === kind && item.slug === slug);
  const saved = row && readArticleDocument(row.payload);
  if (saved) return { document: saved, slug, origin: row.origin, status: row.status, version: row.version || row.updatedAt };
  const post = kind === 'article' ? allEditorialPosts.find(item => item.slug === slug) : null;
  const person = kind === 'role_model' ? roleModels.find(item => item.slug === slug) : null;
  if (!post && !person) return null;
  const doc = post ? editorialDocument(applyEditorialRevision(post, row)) : roleModelDocument(person!);
  if (row?.payload.body?.trim() && doc.format === 'editorial') doc.content = { ...doc.content, intro: row.payload.body.split(/\n\s*\n/), sections: [] };
  return { document: doc, slug, origin: 'static' as const, status: row?.status || 'published', version: row?.version || row?.updatedAt || null };
}
