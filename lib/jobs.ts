import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { PUBLIC_READ_TIMEOUT_MS, publicContentTag } from '@/lib/public-content-cache';

export type LocalJob = {
  id: string;
  kind: 'offer' | 'seeker';
  origin: 'community' | 'external';
  title: string;
  organization: string | null;
  locality: string;
  governorate: 'قنا' | 'الأقصر';
  field: string;
  description: string;
  experience: string | null;
  work_type: 'full-time' | 'part-time' | 'temporary' | 'flexible' | null;
  contact_kind: 'phone' | 'whatsapp' | 'email' | 'link';
  contact_value: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
  expires_at: string;
};

export type JobFeedState = { last_checked_at: string | null; successful_feeds: number; latest_added: number };

async function loadJobs(signal: AbortSignal): Promise<LocalJob[]> {
  const headers = restHeaders();
  const select = 'id,kind,origin,title,organization,locality,governorate,field,description,experience,work_type,contact_kind,contact_value,source_name,source_url,published_at,expires_at';
  const [jobsResponse, seekersResponse] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/naqada_jobs?select=${select}&status=eq.published&kind=eq.offer&order=published_at.desc&limit=200`, { headers, cache: 'no-store', signal }),
    fetch(`${SUPABASE_URL}/rest/v1/naqada_jobs?select=${select}&status=eq.published&kind=eq.seeker&order=published_at.desc&limit=50`, { headers, cache: 'no-store', signal }),
  ]);
  if (!jobsResponse.ok || !seekersResponse.ok) throw new Error('JOB_BOARD_UNAVAILABLE');
  const jobs = [...await jobsResponse.json() as LocalJob[], ...await seekersResponse.json() as LocalJob[]]
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  return jobs;
}

async function loadJobFeedState(signal: AbortSignal): Promise<JobFeedState | null> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/naqada_job_feed_state?select=last_checked_at,successful_feeds,latest_added&id=eq.1&limit=1`, {
    headers: restHeaders(), cache: 'no-store', signal,
  });
  if (!response.ok) throw Error('JOB_FEED_STATE_UNAVAILABLE');
  return (await response.json() as JobFeedState[])[0] || null;
}

const requestJobs = cache(unstable_cache(() => loadJobs(AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS)), ['public-jobs-v3'], { revalidate: 3600, tags: [publicContentTag('jobs')] }));
// Source-check timestamps change even when every offer is unchanged. Refresh
// this small status independently at the feed cadence, never all public content.
const requestJobFeedState = cache(unstable_cache(() => loadJobFeedState(AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS)), ['job-feed-state-v1'], { revalidate: 1800, tags: [publicContentTag('jobs')] }));

export async function getJobs(signal?: AbortSignal): Promise<{ jobs: LocalJob[]; state: JobFeedState | null; available: boolean }> {
  try {
    const readSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS)]) : undefined;
    const [jobs, state] = await Promise.all([
      readSignal ? loadJobs(readSignal) : requestJobs(),
      (readSignal ? loadJobFeedState(readSignal) : requestJobFeedState()).catch(() => null),
    ]);
    readSignal?.throwIfAborted();
    // Expiry is checked on every call; failed source reads never become a cached empty board.
    return { state, jobs: jobs.filter((job) => Date.parse(job.expires_at) > Date.now()), available: true };
  } catch {
    return { jobs: [], state: null, available: false };
  }
}
