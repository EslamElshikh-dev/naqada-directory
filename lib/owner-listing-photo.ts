export function ownerPhotoUrl(path: string) {
  return `/api/owner-photos/${path.split('/').map(encodeURIComponent).join('/')}`;
}

type ActivityPhotos = { cover_path?: string | null; photo_paths: string[] };

export function ownerListingCoverPath(listing: ActivityPhotos) {
  return listing.cover_path || listing.photo_paths[0] || null;
}

export function ownerListingPhotoPaths(listing: ActivityPhotos) {
  return [...new Set([listing.cover_path, ...listing.photo_paths].filter((path): path is string => Boolean(path)))];
}
