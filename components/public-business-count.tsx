import { NUMBER_LOCALE } from '@/lib/format-number';
import { getPublicBusinessCatalog } from '@/lib/curated-content';

export async function PublicBusinessCount() {
  try {
    const catalog = await getPublicBusinessCatalog();
    return catalog.businesses.length.toLocaleString(NUMBER_LOCALE);
  } catch {
    return <span aria-label="العدد غير متاح الآن">—</span>;
  }
}
