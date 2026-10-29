import { slugify } from './site';

const reviewedSlugs: Record<string,string> = {
'121fb926-58e2-4433-b740-b0321c4ecc3d':'عادل-امين-الخطاره',
'7828410d-1d6b-4ab9-8394-6a266d0bcf2e':'تسويق-مدينه-نقاده',
'7cc28ebe-cfd9-463a-b5cb-c1f059d2a020':'السلطان-طوخ',
'c0cc8755-5190-42da-bb62-61f482ff3e5e':'الحرش-لصيانه-الاسكوتر-والدش-الخطاره',
'c1b048ea-9a30-46cf-a797-53735357ad1c':'الماس-فون-طوخ',
'd2d26ebf-2af8-445c-96fc-7bd4b308faff':'فني-تكييف-وتبريد-وصيانه-ثلاجات-الخطاره',
'd82c81a9-db54-47ca-a73a-e1620ce1c445':'مركز-المنار-لخدمات-الكمبيوتر-والانترنت-دنفيق',
'eacc834d-3418-40e7-97b5-6c25b8d3f8c6':'الرحمه-لكاميرات-المراقبه-مدينه-نقاده',
};
const reviewedIds = new Map(Object.entries(reviewedSlugs).map(([id,slug])=>[slug,id]));

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function ownerActivityId(segment: string) {
  try { segment = decodeURIComponent(segment); } catch { return null; }
  if (segment.includes('/') || segment.includes('?') || segment.includes('#')) return null;
  const reviewed = reviewedIds.get(segment); if (reviewed) return reviewed;
  return new RegExp('(?:^|-|:)(' + uuid + ')$', 'i').exec(segment)?.[1]?.toLowerCase() || null;
}
export function ownerActivityHref(item: { id: string; name?: string }) {
  const id = ownerActivityId(item.id);
  if (!id) throw new Error('Invalid owner activity id');
  if (reviewedSlugs[id]) return '/activity/' + encodeURIComponent(reviewedSlugs[id]) + '/';
  const name = item.name ? slugify(item.name).slice(0, 65).replace(/-+$/, '') : '';
  return '/activity/' + (name ? encodeURIComponent(name) + '-' : '') + id + '/';
}

export function reviewedActivityRedirect(segment: string) {
  const id = ownerActivityId(segment);
  if (!id || !reviewedSlugs[id]) return null;
  const canonical = ownerActivityHref({ id });
  return ownerActivityNeedsRedirect(segment,canonical) ? canonical : null;
}

export function ownerActivityNeedsRedirect(requestedSegment: string, canonicalHref: string) {
  let requested = requestedSegment;
  try { requested = decodeURIComponent(requestedSegment); } catch {}
  return requested !== decodeURIComponent(canonicalHref.split('/')[2]);
}
