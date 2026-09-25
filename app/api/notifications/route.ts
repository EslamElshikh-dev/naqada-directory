import { NextResponse } from 'next/server';
import { businesses } from '@/lib/data';
import { allEditorialPosts } from '@/lib/editorial-posts-all';
import { getJobs } from '@/lib/jobs';
import type { DirectoryNotice } from '@/lib/notifications';
import { roleModels } from '@/lib/role-models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = Date.now();
  const earliest = now - 30 * 24 * 60 * 60 * 1000;
  const recent = (date: string) => {
    const time = Date.parse(date);
    return Number.isFinite(time) && time >= earliest && time <= now + 24 * 60 * 60 * 1000;
  };
  const { jobs } = await getJobs(AbortSignal.timeout(4500));
  const notices: DirectoryNotice[] = [
    ...jobs.filter((job) => job.kind === 'offer' && recent(job.published_at)).slice(0, 2).map((job) => ({
      id: `job:${job.id}:${job.published_at}`, href: `/jobs#job-${job.id}`,
      label: 'فرصة عمل منشورة', title: job.title,
      detail: `${job.locality} · ${job.organization || job.field}`,
      occurredAt: job.published_at, tone: 'mint' as const,
    })),
    ...[...roleModels].filter((person) => recent(person.modifiedAt)).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, 2).map((person) => ({
      id: `person:${person.slug}:${person.modifiedAt}`, href: `/role-models/${person.slug}`,
      label: 'نموذج مشرّف', title: person.name,
      detail: `قصة من ${person.locality}`, occurredAt: person.modifiedAt, tone: 'gold' as const,
    })),
    ...[...allEditorialPosts].filter((post) => recent(post.publishedAt)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 2).map((post) => ({
      id: `story:${post.slug}:${post.publishedAt}`, href: `/blog/${post.slug}`,
      label: 'حكاية منشورة', title: post.title,
      detail: post.locality, occurredAt: post.publishedAt, tone: 'coral' as const,
    })),
    ...[...businesses].filter((item) => item.checked && recent(item.checked)).sort((a, b) => (b.checked || '').localeCompare(a.checked || '')).slice(0, 2).map((item) => ({
      id: `listing:${item.slug}:${item.checked}`, href: `/listing/${item.slug}`,
      label: 'بيانات نشاط راجعناها', title: item.name,
      detail: item.locality || 'مركز نقادة', occurredAt: item.checked!, tone: 'mint' as const,
    })),
  ];

  notices.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return NextResponse.json({ items: notices.slice(0, 8) }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
