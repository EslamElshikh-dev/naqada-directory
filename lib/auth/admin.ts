import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

export async function isDirectoryAdmin(accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_directory_admin`, {
    method: 'POST',
    headers: restHeaders(accessToken, true),
    body: '{}',
    cache: 'no-store',
  });
  return response.ok && Boolean(await response.json());
}

export type AdminStats = {
  members: number;
  siteReviews: number;
  siteRating: number;
  listingRatings: number;
  pendingContributions: number;
  events30d: number;
};

export async function getAdminStats(accessToken: string): Promise<AdminStats> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_naqada_admin_stats`, {
    method: 'POST',
    headers: restHeaders(accessToken, true),
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('ADMIN_STATS_FAILED');
  return response.json() as Promise<AdminStats>;
}
