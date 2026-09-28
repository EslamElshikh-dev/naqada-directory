import { NextResponse } from 'next/server';
import { getLiveNews } from '@/lib/news';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const feed = await getLiveNews();
  return NextResponse.json({
    items: feed.items.filter(item => !item.isOriginal).slice(0, 120),
    checkedAt: feed.checkedAt,
    successfulFeeds: feed.successfulFeeds,
  }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' } });
}
