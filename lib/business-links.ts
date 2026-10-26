export function publicBusinessHref(item: { id: string; slug: string }) {
  const owner = /^owner[:-]([0-9a-f-]{36})$/i.exec(item.id);
  return owner ? `/activity/${owner[1]}/` : `/listing/${encodeURIComponent(item.slug)}/`;
}
