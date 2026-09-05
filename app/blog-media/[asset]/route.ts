const assets: Record<string, string> = {
  'bashlaw-today-hero.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/d8cb3e7e-a2a5-4006-a63a-bac16e1ca39f.jpg',
  'bashlaw-quran-learning.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/e6963a37-bed4-46ad-8ae2-cd2e35b81537.jpg',
  'asmant-mawlid-marmah.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/5c05d488-1cc1-4fb3-ae2c-073d6977c49f.jpg',
  'asmant-community-gathering.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/38bb6aa2-59e2-4e8c-b3d4-904f29f3ae6b.jpg',
  'sahil-bashlaw-hawawra.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/fea96d12-0ff8-4334-9dbf-34f283748d29.jpg',
  'sahil-bashlaw-lane-secondary.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/de7a17c6-2b6e-44de-859c-46e0c66192f8.jpg',
  'daraw-community.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/d39aca80-ec6f-471b-9618-f933f8c712c0.jpg',
  'sahil-daraw-sheikh-fakhry.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/ccc763ad-21f1-4630-9fe6-9c06173affd6.jpg',
  'naj-al-qarya-quran-community.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/7918c38f-e35c-4d57-aa91-1397d161e3e2.jpg',
  'naj-al-sadr-community.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/a66c8b72-e2e5-473e-92f6-cc43c43a70e7.jpg',
  'awsat-qamula-network.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/4443d10f-e088-4760-b628-b1eb6fa38cec.jpg',
  'hager-tukh-pottery.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/43e522bf-1d65-4961-8f32-27c24e190ec2.jpg',
  'naqada-pottery-heritage.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/4fcfe0e3-569e-44a2-99ce-ee8724bab063.jpg',
  'khattara-rural-network.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/4443d10f-e088-4760-b628-b1eb6fa38cec.jpg',
  'khattara-community-life.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/d39aca80-ec6f-471b-9618-f933f8c712c0.jpg',
  'khattara-learning-youth.jpg': 'https://cdn.creativeclaw.co/u/34cb5082/images/e6963a37-bed4-46ad-8ae2-cd2e35b81537.jpg',
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
