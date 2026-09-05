import { editorialPosts as firstEditorialPosts } from './editorial-posts';
import { editorialPostsBatch2A } from './editorial-posts-batch-2a';
import { editorialPostsBatch2B } from './editorial-posts-batch-2b';
import { editorialPostsBatch2C } from './editorial-posts-batch-2c';

export const allEditorialPosts = [
  ...firstEditorialPosts,
  ...editorialPostsBatch2A,
  ...editorialPostsBatch2B,
  ...editorialPostsBatch2C,
];

export function getAllEditorialPost(slug: string) {
  return allEditorialPosts.find((post) => post.slug === slug) || null;
}
