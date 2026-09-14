import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import type { ContributionQueueSnapshot } from '@/lib/contribution-review';

export type ContributionReviewAction = 'start_review' | 'request_info' | 'approve' | 'reject' | 'mark_published' | 'reopen';

export const emptyContributionQueue: ContributionQueueSnapshot = {
  generatedAt: '',
  summary: {
    pending: 0,
    reviewing: 0,
    needsInfo: 0,
    approved: 0,
    rejected: 0,
    published: 0,
    oldestOpenAt: null,
  },
  items: [],
};

export async function getContributionQueue(accessToken: string): Promise<ContributionQueueSnapshot> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_naqada_contribution_queue`, {
    method: 'POST',
    headers: restHeaders(accessToken, true),
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('CONTRIBUTION_QUEUE_FAILED');
  return response.json() as Promise<ContributionQueueSnapshot>;
}

export async function reviewContribution(accessToken: string, input: {
  id: string;
  action: ContributionReviewAction;
  notes?: string;
  message?: string;
}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/review_naqada_contribution`, {
    method: 'POST',
    headers: restHeaders(accessToken, true),
    body: JSON.stringify({
      p_id: input.id,
      p_action: input.action,
      p_notes: input.notes?.trim() || null,
      p_message: input.message?.trim() || null,
    }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; id?: string; status?: string; message?: string };
  if (!response.ok || payload.ok !== true) throw new Error(payload.message || 'CONTRIBUTION_REVIEW_FAILED');
  return payload;
}
