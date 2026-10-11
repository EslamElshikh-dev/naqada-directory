import type { LocalJob } from '@/lib/jobs';

export const MAX_JOB_HEADLINES = 6;

export function buildJobHeadlines(jobs: LocalJob[], naqadaPlaces: Set<string>) {
  const newest = [...jobs].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  // Reserve two places for seekers so incoming external offers cannot hide them.
  const selected = [...newest.filter((job) => job.kind === 'offer').slice(0, 4), ...newest.filter((job) => job.kind === 'seeker').slice(0, 2)]
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  return selected.map((job) => ({
    tag: job.kind === 'seeker' ? 'باحث عن عمل' : job.governorate === 'الأقصر' ? 'فرص الأقصر' : naqadaPlaces.has(job.locality) ? 'شغل في نقادة' : 'فرص قنا',
    text: [job.title, job.kind === 'seeker' ? job.field : null, job.locality].filter(Boolean).join(' · '),
    href: `/jobs#job-${job.id}`,
  }));
}
