import { ownerActivityHref } from '@/lib/activity-path';
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { ownerListingCoverPath, ownerPhotoUrl } from '@/lib/owner-listing-photo';
import type { DirectoryItem } from '@/lib/types';
import { unstable_cache } from 'next/cache';
import { PUBLIC_CONTENT_TAG, PUBLIC_CONTENT_TTL, PUBLIC_READ_TIMEOUT_MS, retryPublicRead } from '@/lib/public-content-cache';

export type OwnerListing = {
  id: string;
  owner_user_id: string;
  name: string;
  phone: string;
  hours: string;
  address: string;
  description: string;
  category: string;
  locality: string;
  photo_paths: string[];
  cover_path?: string | null;
  maps_url?: string | null;
  status: 'pending' | 'published' | 'rejected';
  created_at: string;
  updated_at: string;
};

export const ownerListingSelect = 'id,owner_user_id,name,phone,hours,address,description,category,locality,photo_paths,cover_path,maps_url,status,created_at,updated_at';

export const getPublishedOwnerListings = unstable_cache(() => retryPublicRead(async (): Promise<OwnerListing[]> => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?status=eq.published&select=${ownerListingSelect}&order=created_at.desc&limit=500`,
    { headers: restHeaders(), cache: 'no-store', signal: AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS) },
  );
  if (!response.ok) throw Object.assign(Error('PUBLIC_ACTIVITIES_UNAVAILABLE'), { status: response.status });
  return response.json() as Promise<OwnerListing[]>;
}, 'owner-catalog'), ['naqada-published-activities-v1'], { revalidate: PUBLIC_CONTENT_TTL, tags: [PUBLIC_CONTENT_TAG] });

export const getPublishedOwnerListing = unstable_cache((id: string) => retryPublicRead(async (): Promise<OwnerListing | null> => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?id=eq.${encodeURIComponent(id)}&status=eq.published&select=${ownerListingSelect}&limit=1`,
    { headers: restHeaders(), cache: 'no-store', signal: AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS) },
  );
  if (!response.ok) throw Object.assign(Error('PUBLIC_ACTIVITY_UNAVAILABLE'), { status: response.status });
  const rows = await response.json() as OwnerListing[];
  return rows[0] || null;
}, 'owner-activity'), ['naqada-published-activity-v1'], { revalidate: PUBLIC_CONTENT_TTL, tags: [PUBLIC_CONTENT_TAG] });

export function ownerListingDirectoryItem(listing: OwnerListing): DirectoryItem {
  const coverPath = ownerListingCoverPath(listing);
  return {
    id: `owner-${listing.id}`,
    slug: listing.id,
    name: listing.name,
    normalizedName: listing.name,
    category: listing.category,
    subcategory: null,
    locality: listing.locality,
    parentLocality: null,
    address: listing.address,
    phone: listing.phone,
    rating: null,
    reviews: null,
    mapsUrl: listing.maps_url || null,
    verification: null,
    detailHref: ownerActivityHref(listing),
    imageUrl: coverPath ? ownerPhotoUrl(coverPath) : null,
  };
}
