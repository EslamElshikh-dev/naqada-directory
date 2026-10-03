import { readStructuredJob } from './structured-job.ts';

// The employer's public career site uses this same endpoint for its current
// vacancies. Discover live IDs each run instead of keeping a single old advert.
export const EMPLOYER_LIST_URL = 'https://copticorphans.applicantpro.com/core/jobs/6022?getParams=%7B%7D';
export const employerPostUrl = (url: string) => /^https:\/\/copticorphans\.applicantpro\.com\/jobs\/\d+(?:\.html)?$/.test(url);
export const readEmployerPosting = (html: string, url: string, now = Date.now()) =>
  readStructuredJob(html, url, { name: 'Coptic Orphans · موقع التوظيف الرسمي', accepts: employerPostUrl, freshnessDays: 30 }, now);

export function employerListingLinks(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const response = value as { success?: unknown; data?: { jobs?: unknown } };
  if (response.success !== true || !Array.isArray(response.data?.jobs)) return null;
  return [...new Set(response.data.jobs.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const job = item as Record<string, unknown>;
    if (job.iso3 !== 'EGY' || typeof job.jobUrl !== 'string' || !employerPostUrl(job.jobUrl)) return [];
    const location = `${job.title || ''} ${job.jobLocation || ''}`;
    return /قنا|نقادة|\b(?:qena|qina|naqada|nagada)\b/i.test(location) ? [job.jobUrl] : [];
  }))].slice(0, 6);
}

export async function scanEmployerJobs() {
  try {
    const reply = await fetch(EMPLOYER_LIST_URL, { signal: AbortSignal.timeout(7000) });
    if (!reply.ok) return { ok: false, jobs: [] };
    const urls = employerListingLinks(JSON.parse((await reply.text()).slice(0, 180_000)));
    if (!urls) return { ok: false, jobs: [] };
    const jobs = await Promise.all(urls.map(async (url) => {
      try {
        const page = await fetch(url, { signal: AbortSignal.timeout(6500) });
        return page.ok ? readEmployerPosting((await page.text()).slice(0, 180_000), url) : null;
      } catch { return null; }
    }));
    return { ok: true, jobs: jobs.filter((job): job is NonNullable<typeof job> => job !== null) };
  } catch { return { ok: false, jobs: [] }; }
}
