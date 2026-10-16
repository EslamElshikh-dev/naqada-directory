import { meta } from './data';
import { allEditorialPosts } from './editorial-posts-all';
import { roleModels } from './role-models';

// Change this date when the homepage's own editorial copy changes.
const homeCopyModifiedAt = '2026-10-16T00:00:00.000Z';

export function getHomeLastModified() {
  const timestamps = [
    homeCopyModifiedAt,
    meta.updatedAt,
    ...allEditorialPosts.slice(0, 4).map((article) => article.modifiedAt),
    ...roleModels.map((person) => person.modifiedAt),
  ].map((value) => Date.parse(value)).filter(Number.isFinite);

  return new Date(Math.max(...timestamps));
}
