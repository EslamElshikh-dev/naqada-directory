import { NextResponse } from 'next/server';
import { getLatestNews } from '@/lib/news';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 300;

export async function GET() {
  const feed = await getLatestNews();
  return NextResponse.json(
    {
      items: feed.items.slice(0, 8).map((item) => ({
        id: item.id,
        tag: item.source,
        text: item.title,
        href: `/news/${item.id}`,
      })),
      checkedAt: feed.checkedAt,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}
