import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

export type ContributionRequest = {
  id: string; name: string; requestType: string; category: string | null;
  locality: string | null; details: string | null; sourceUrl: string | null;
  contact: string | null; listingSlug: string | null; status: string; createdAt: string;
};

export async function getContributionQueue(token: string): Promise<ContributionRequest[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_naqada_contribution_queue`, {
    method: 'POST', headers: restHeaders(token, true), body: '{}', cache: 'no-store',
  });
  if (!response.ok) throw new Error('QUEUE_UNAVAILABLE');
  return ((await response.json()) as { items: ContributionRequest[] }).items
    .filter((item) => ['pending', 'reviewing', 'needs_info', 'approved'].includes(item.status))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export type RecentRequest = {
  id: string; kind: 'business' | 'contribution'; requestType: string;
  name: string; locality: string | null; status: string; createdAt: string;
  reviewedAt: string | null; details: string | null; contact: string | null;
  submitter: string | null; hasMember: boolean; href: string; reviewHref: string;
};

export async function getRecentRequests(token: string): Promise<RecentRequest[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_naqada_recent_requests`, {
    method: 'POST', headers: restHeaders(token, true), body: '{}', cache: 'no-store',
  });
  if (!response.ok) throw new Error('RECENT_REQUESTS_UNAVAILABLE');
  return ((await response.json()) as { items: RecentRequest[] }).items;
}
