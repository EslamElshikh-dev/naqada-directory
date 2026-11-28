import { meta } from './data';
import { allEditorialPosts } from './editorial-posts-all';
import { roleModels } from './role-models';

// Change this date when the homepage's own editorial copy changes.
const homeCopyModifiedAt = '2026-11-28T00:00:00.000Z';

export function getHomeLastModified(posts = allEditorialPosts, people = roleModels, businesses: readonly { checked: string | null }[] = []) {
  const timestamps = [
    homeCopyModifiedAt,
    meta.updatedAt,
    ...posts.slice(0, 4).map((article) => article.modifiedAt),
    ...people.map((person) => person.modifiedAt),
    ...businesses.flatMap((item) => item.checked ? [item.checked] : []),
  ].map((value) => Date.parse(value)).filter(Number.isFinite);

  return new Date(Math.max(...timestamps));
}
