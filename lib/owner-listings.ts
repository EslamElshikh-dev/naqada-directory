import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { ownerListingCoverPath, ownerPhotoUrl } from '@/lib/owner-listing-photo';
import type { DirectoryItem } from '@/lib/types';

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

export async function getPublishedOwnerListings(): Promise<OwnerListing[]> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?status=eq.published&select=${ownerListingSelect}&order=created_at.desc&limit=500`,
    { headers: restHeaders(), cache: 'no-store' },
  );
  if (!response.ok) return [];
  return response.json() as Promise<OwnerListing[]>;
}

export async function getPublishedOwnerListing(id: string): Promise<OwnerListing | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/directory_owner_listings?id=eq.${encodeURIComponent(id)}&status=eq.published&select=${ownerListingSelect}&limit=1`,
    { headers: restHeaders(), cache: 'no-store' },
  );
  if (!response.ok) return null;
  const rows = await response.json() as OwnerListing[];
  return rows[0] || null;
}

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
    detailHref: `/activity/${listing.id}/`,
    imageUrl: coverPath ? ownerPhotoUrl(coverPath) : null,
  };
}
