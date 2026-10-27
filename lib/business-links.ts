import { ownerActivityHref } from './activity-path';
export function publicBusinessHref(item: { id: string; slug: string; name?: string }) {
  const owner = /^owner[:-]([0-9a-f-]{36})$/i.exec(item.id);
  return owner ? ownerActivityHref({ id: owner[1], name: item.name }) : `/listing/${encodeURIComponent(item.slug)}/`;
}
