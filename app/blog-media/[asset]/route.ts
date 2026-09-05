const assets: Record<string, string> = {
  'bashlaw-today-hero.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/d8cb3e7e-a2a5-4006-a63a-bac16e1ca39f.jpg',
  'bashlaw-quran-learning.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/e6963a37-bed4-46ad-8ae2-cd2e35b81537.jpg',
};

export const revalidate = 604800;

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  const source = assets[asset];
  if (!source) return new Response('Not found', { status: 404 });

  const response = await fetch(source, { next: { revalidate: 604800 } });
  if (!response.ok || !response.body) return new Response('Image unavailable', { status: 502 });

  return new Response(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      'X-Robots-Tag': 'index, follow',
    },
  });
}
