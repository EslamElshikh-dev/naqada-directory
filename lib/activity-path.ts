import { slugify } from './site';

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function ownerActivityId(segment: string) {
  if (segment.includes('/') || segment.includes('?') || segment.includes('#')) return null;
  return new RegExp('(?:^|-|:)(' + uuid + ')$', 'i').exec(segment)?.[1]?.toLowerCase() || null;
}
export function ownerActivityHref(item: { id: string; name?: string }) {
  const id = ownerActivityId(item.id);
  if (!id) throw new Error('Invalid owner activity id');
  const name = item.name ? slugify(item.name).slice(0, 65).replace(/-+$/, '') : '';
  return '/activity/' + (name ? encodeURIComponent(name) + '-' : '') + id + '/';
}

export function ownerActivityNeedsRedirect(requestedSegment: string, canonicalHref: string) {
  let requested = requestedSegment;
  try { requested = decodeURIComponent(requestedSegment); } catch {}
  return requested !== decodeURIComponent(canonicalHref.split('/')[2]);
}
