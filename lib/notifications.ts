export type DirectoryNotice = {
  id: string;
  href: string;
  label: string;
  title: string;
  detail: string;
  occurredAt: string;
  tone: 'mint' | 'gold' | 'coral';
  kind?: 'decision' | 'cover';
  status?: string;
};

export function mergePersonalNotices(...feeds: DirectoryNotice[][]): DirectoryNotice[] {
  return [...new Map(feeds.flat().map((notice) => [notice.id, notice])).values()]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 100);
}

export async function getRequestNotifications(token: string): Promise<{ items: DirectoryNotice[] }> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_naqada_request_notifications`, {
    method: 'POST', headers: restHeaders(token, true), body: '{}', cache: 'no-store',
  });
  if (!response.ok) throw new Error('REQUEST_NOTIFICATIONS_UNAVAILABLE');
  return response.json();
}
import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
