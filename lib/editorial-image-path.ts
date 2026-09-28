/** Uploaded editorial photographs use public assets; older articles use the media proxy. */
export function editorialImagePath(asset: string) {
  return asset.startsWith('/images/blog/') ? asset : `/blog-media/${encodeURIComponent(asset)}`;
}
