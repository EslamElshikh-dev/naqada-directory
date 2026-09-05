import { editorialPosts as firstEditorialPosts } from './editorial-posts';
import { editorialPostsBatch2A } from './editorial-posts-batch-2a';
import { editorialPostsBatch2B } from './editorial-posts-batch-2b';
import { editorialPostsBatch2C } from './editorial-posts-batch-2c';
import { editorialPostsBatch3A } from './editorial-posts-batch-3a';
import { editorialPostsBatch3B } from './editorial-posts-batch-3b';
import { editorialPostsBatch3C } from './editorial-posts-batch-3c';
import { editorialPostsBatch3D } from './editorial-posts-batch-3d';
import { editorialPostsBatch3E } from './editorial-posts-batch-3e';
import { enrichEditorialPostImages } from './editorial-post-image-enrichment';

const baseEditorialPosts = [
  ...firstEditorialPosts,
  ...editorialPostsBatch2A,
  ...editorialPostsBatch2B,
  ...editorialPostsBatch2C,
  ...editorialPostsBatch3A,
  ...editorialPostsBatch3B,
  ...editorialPostsBatch3C,
  ...editorialPostsBatch3D,
  ...editorialPostsBatch3E,
];

export const allEditorialPosts = baseEditorialPosts.map(enrichEditorialPostImages);

export function getAllEditorialPost(slug: string) {
  return allEditorialPosts.find((post) => post.slug === slug) || null;
}
