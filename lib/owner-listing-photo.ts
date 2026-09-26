export function ownerPhotoUrl(path: string) {
  return `/api/owner-photos/${path.split('/').map(encodeURIComponent).join('/')}`;
}
