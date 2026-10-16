/** Uploaded editorial photographs use public assets; older articles use the media proxy. */
export function editorialImagePath(asset: string) {
  return asset.startsWith('/images/') || asset.startsWith('/api/article-media/') ? asset : `/blog-media/${encodeURIComponent(asset)}`;
}
