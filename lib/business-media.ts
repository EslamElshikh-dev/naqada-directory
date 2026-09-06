import businessMediaData from '@/data/business-media.json';

export type BusinessMediaRecord = {
  businessId: string;
  imageUrl: string;
  imageAlt: string;
  caption: string;
  sourceUrl: string;
  sourceName: string;
  credit: string;
  verifiedAt: string;
};

const mediaByBusinessId = new Map(
  (businessMediaData as BusinessMediaRecord[]).map((item) => [item.businessId, item]),
);

export function getBusinessMedia(businessId: string) {
  return mediaByBusinessId.get(businessId) || null;
}

export function hasBusinessMedia(businessId: string) {
  return mediaByBusinessId.has(businessId);
}
