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

export type VisitorAnalytics = {
  generatedAt: string;
  totals: {
    lifetimeVisitors: number;
    visitorsToday: number;
    uniqueVisitors30d: number;
    newVisitors30d: number;
    returningVisitors30d: number;
    previousUniqueVisitors30d: number;
    pageViews30d: number;
    identifiedVisitors30d: number;
    members30d: number;
    members7d: number;
  };
  dailySeries: Array<{ date: string; visitors: number; views: number }>;
  topPages: Array<{ path: string; views: number; visitors: number }>;
  sources: Array<{ source: string; visitors: number }>;
  devices: Array<{ device: 'mobile' | 'tablet' | 'desktop'; visitors: number }>;
  events: Array<{ event: string; count: number }>;
  missedSearches: Array<{ query: string; count: number }>;
  identifiedVisitors: Array<{
    id: string;
    name: string;
    email: string;
    bio: string | null;
    locality: string | null;
    avatarUrl: string | null;
    lastSeenAt: string;
    pageViews: number;
    browsers: number;
  }>;
};

export const emptyVisitorAnalytics: VisitorAnalytics = {
  generatedAt: '',
  totals: {
    lifetimeVisitors: 0,
    visitorsToday: 0,
    uniqueVisitors30d: 0,
    newVisitors30d: 0,
    returningVisitors30d: 0,
    previousUniqueVisitors30d: 0,
    pageViews30d: 0,
    identifiedVisitors30d: 0,
    members30d: 0,
    members7d: 0,
  },
  dailySeries: [],
  topPages: [],
  sources: [],
  devices: [],
  events: [],
  missedSearches: [],
  identifiedVisitors: [],
};

export async function getVisitorAnalytics(accessToken: string): Promise<VisitorAnalytics> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_naqada_visitor_analytics`, {
    method: 'POST',
    headers: restHeaders(accessToken, true),
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('VISITOR_ANALYTICS_FAILED');
  return response.json() as Promise<VisitorAnalytics>;
}
