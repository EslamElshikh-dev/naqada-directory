// CI-only fixtures: generated in the local checkout, never committed or deployed.
import { mkdirSync, writeFileSync } from 'node:fs';
for (const [path, document] of [
  ['__qa-article-editor', "{ format: 'editorial', content: editorialPosts[0], sharing: { title: '', description: '' } }"],
  ['__qa-role-model', "{ format: 'role_model', content: roleModels[0], sharing: { title: '', description: '' } }"],
]) {
  mkdirSync(`app/${path}`, { recursive: true });
  writeFileSync(`app/${path}/page.tsx`, `'use client';
import FullArticleEditor from '@/app/moderator/article-editor';
import { editorialPosts } from '@/lib/editorial-posts';
import { roleModels } from '@/lib/role-models';
import type { ArticleDocument } from '@/lib/article-document';
export default function Fixture() { const document = ${document} as ArticleDocument; return <FullArticleEditor initial={{document, slug: document.content.slug, origin:'static',status:'published',version:null}} onClose={()=>{}} onSaved={()=>{}} />; }
`);
}
