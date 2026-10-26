import { SUPABASE_URL, restHeaders, SupabaseAuthError } from '@/lib/auth/supabase-rest';
import { unstable_cache } from 'next/cache';
import { invalidatePublicContent, PUBLIC_CONTENT_TAG, PUBLIC_CONTENT_TTL, PUBLIC_READ_TIMEOUT_MS, retryPublicRead } from '@/lib/public-content-cache';

export type CuratedKind = 'business' | 'news' | 'article' | 'role_model';
export type CuratedRecord = {
  id?: string;
  kind: CuratedKind;
  slug: string;
  origin: 'static' | 'original';
  status: 'draft' | 'published' | 'hidden';
  payload: Record<string, string>;
  updatedAt: string;
  updatedBy?: string;
  version?: string;
  publishedStatus?: string;
};

async function rpc<T>(name: string, token?: string, data: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: restHeaders(token, true),
    body: JSON.stringify(data),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (name === 'save_naqada_article_document' && error.code === '40001') throw new Error('ARTICLE_CONFLICT');
    throw new Error(`RPC_${name}_${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function isGoldModerator(token: string) {
  return rpc<boolean>('is_directory_gold_moderator', token);
}

export async function canModerate(token: string) {
  return rpc<boolean>('can_moderate_naqada', token);
}

export async function memberAllowed(token: string) {
  return rpc<boolean>('is_naqada_member_allowed', token);
}

export async function assertMemberAllowed(token: string) {
  if (!(await memberAllowed(token))) {
    throw new SupabaseAuthError('هذا الحساب مقيد حاليًا. تواصل مع إدارة دليل نقادة للمراجعة.', 403, 'member_restricted');
  }
}

export const getPublicCurated = unstable_cache(async (kind: CuratedKind): Promise<CuratedRecord[]> => {
  return retryPublicRead(() => rpc<CuratedRecord[]>('get_public_naqada_content', undefined, { p_kind: kind }, AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS)), kind);
}, ['naqada-public-curated-v1'], { revalidate: PUBLIC_CONTENT_TTL, tags: [PUBLIC_CONTENT_TAG] });

export async function getEditorContent(token: string): Promise<CuratedRecord[]> {
  return rpc<CuratedRecord[]>('get_naqada_editor_content', token);
}

export type ModeratorDashboard = {
  generatedAt: string;
  viewer: { name: string; avatarUrl: string | null };
  metrics: {
    visitors30d: number; newVisitors30d: number; pageViews30d: number; visitorsToday: number;
    members: number; pendingBusinesses: number; pendingContributions: number;
    publishedContent: number; myActions30d: number;
  };
  daily: Array<{ date: string; visitors: number; views: number }>;
  topPages: Array<{ path: string; views: number }>;
  missedSearches: Array<{ query: string; count: number; id?: string; variants?: string[] }>;
  businesses: Array<{
    id: string; owner_user_id: string; name: string; phone: string; hours: string;
    address: string; description: string; category: string; locality: string;
    photo_paths: string[]; cover_path?: string | null; maps_url?: string | null; status: string; created_at: string;
  }>;
  contributions: Array<{
    id: string; name: string; request_type: string; category: string; locality: string;
    details: string; status: string; created_at: string; review_notes: string | null;
  }>;
  reviews: Array<{
    id: string; author_name: string; rating: number; body: string; status: string; created_at: string;
  }>;
  members: Array<{
    id: string; email: string; name: string; createdAt: string; status: string;
    until: string | null; role: string | null;
  }>;
  activity: Array<{ action: string; kind: string; target: string; at: string; actor: string }>;
};

export async function getModeratorDashboard(token: string, search = '') {
  return rpc<ModeratorDashboard>('get_naqada_moderator_dashboard', token, { p_search: search.slice(0, 80) });
}

export type ModeratorOwnerReport = {
  generatedAt: string;
  moderator: { id: string; name: string; avatarUrl: string | null; email: string; active: boolean; since: string; status: string } | null;
  actions30d: number;
  actionsByType: Array<{ action: string; count: number }>;
  recent: Array<{ action: string; kind: string; target: string; at: string; actor: string }>;
};

export async function getModeratorOwnerReport(token: string) {
  return rpc<ModeratorOwnerReport>('get_naqada_moderator_owner_report', token);
}

export async function getGoldModeratorNotifications(token: string) {
  return rpc<{ generatedAt: string; items: import('@/lib/notifications').DirectoryNotice[] }>('get_naqada_gold_notifications', token);
}

export async function callModeratorAction(token: string, name: string, body: Record<string, unknown>) {
  const result = await rpc<unknown>(name, token, body);
  invalidatePublicContent();
  return result;
}
