import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

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

export async function getJobs(signal?: AbortSignal): Promise<{ jobs: LocalJob[]; state: JobFeedState | null; available: boolean }> {
  const headers = restHeaders();
  const select = 'id,kind,origin,title,organization,locality,governorate,field,description,experience,work_type,contact_kind,contact_value,source_name,source_url,published_at,expires_at';
  try {
    const [jobsResponse, seekersResponse, stateResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/naqada_jobs?select=${select}&status=eq.published&kind=eq.offer&order=published_at.desc&limit=200`, { headers, cache: 'no-store', signal }),
      fetch(`${SUPABASE_URL}/rest/v1/naqada_jobs?select=${select}&status=eq.published&kind=eq.seeker&order=published_at.desc&limit=50`, { headers, cache: 'no-store', signal }),
      fetch(`${SUPABASE_URL}/rest/v1/naqada_job_feed_state?select=last_checked_at,successful_feeds,latest_added&id=eq.1&limit=1`, { headers, cache: 'no-store', signal }),
    ]);
    if (!jobsResponse.ok || !seekersResponse.ok) throw new Error('JOB_BOARD_UNAVAILABLE');
    const jobs = [...await jobsResponse.json() as LocalJob[], ...await seekersResponse.json() as LocalJob[]]
      .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    const state = stateResponse.ok ? (await stateResponse.json() as JobFeedState[])[0] || null : null;
    return { jobs: jobs.filter((job) => Date.parse(job.expires_at) > Date.now()), state, available: true };
  } catch {
    return { jobs: [], state: null, available: false };
  }
}
