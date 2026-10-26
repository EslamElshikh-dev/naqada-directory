import { getPublicBusinessCatalog } from '@/lib/curated-content';

export async function PublicBusinessCount() {
  try {
    const catalog = await getPublicBusinessCatalog();
    return catalog.businesses.length.toLocaleString('ar-EG');
  } catch {
    return <span aria-label="العدد غير متاح الآن">—</span>;
  }
}
