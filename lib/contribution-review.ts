import { businesses, canonicalLocalityName } from '@/lib/data';
import type { Business } from '@/lib/types';

export type ContributionStatus = 'pending' | 'reviewing' | 'needs_info' | 'approved' | 'rejected' | 'published';
export type ContributionRequestType = 'add' | 'correction' | 'missing';

export type ContributionQueueRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  requestType: ContributionRequestType;
  name: string;
  category: string | null;
  locality: string | null;
  listingSlug: string | null;
  details: string | null;
  sourceUrl: string | null;
  contact: string | null;
  hasContact: boolean;
  status: ContributionStatus;
  reviewNotes: string | null;
  reviewMessage: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  submittedVia: string;
  submittedByUserId: string | null;
  reviewPriority: number;
  ageDays: number;
};

export type ContributionQueueSnapshot = {
  generatedAt: string;
  summary: {
    pending: number;
    reviewing: number;
    needsInfo: number;
    approved: number;
    rejected: number;
    published: number;
    oldestOpenAt: string | null;
  };
  items: ContributionQueueRow[];
};

export type ListingMatch = {
  slug: string;
  name: string;
  locality: string | null;
  category: string;
  score: number;
  reason: string;
};

export type ReviewQueueItem = ContributionQueueRow & {
  priorityBand: 'عاجل' | 'مرتفع' | 'عادي';
  verificationState: 'قوي' | 'جيد' | 'مصدر فقط' | 'مطابقة فقط' | 'ناقص';
  listingMatch: ListingMatch | null;
  duplicateCount: number;
  duplicateIds: string[];
};

function normalizeArabic(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value?: string | null) {
  return new Set(normalizeArabic(value).split(' ').filter((token) => token.length > 1));
}

function tokenOverlap(a?: string | null, b?: string | null) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.max(left.size, right.size);
}

function localityMatches(row: ContributionQueueRow, business: Business) {
  if (!row.locality || !business.locality) return false;
  return normalizeArabic(row.locality) === normalizeArabic(canonicalLocalityName(business.locality));
}

function scoreBusiness(row: ContributionQueueRow, business: Business) {
  if (row.listingSlug && row.listingSlug === business.slug) {
    return { score: 100, reason: 'السجل مرتبط مباشرة بطلب المساهمة' };
  }

  const rowName = normalizeArabic(row.name);
  const businessName = normalizeArabic(business.name || business.normalizedName);
  const exactName = Boolean(rowName && businessName && rowName === businessName);
  const overlap = tokenOverlap(row.name, business.name || business.normalizedName);
  const sameLocality = localityMatches(row, business);
  const sameCategory = Boolean(row.category && normalizeArabic(row.category) === normalizeArabic(business.category));

  let score = 0;
  if (exactName) score += 65;
  else score += Math.round(overlap * 45);
  if (sameLocality) score += 20;
  if (sameCategory) score += 10;
  if (business.mapsUrl || business.placeId) score += 5;

  const reasons = [
    exactName ? 'الاسم مطابق' : overlap >= 0.6 ? 'تشابه قوي في الاسم' : overlap >= 0.35 ? 'تشابه جزئي في الاسم' : '',
    sameLocality ? 'نفس الموضع' : '',
    sameCategory ? 'نفس الفئة' : '',
  ].filter(Boolean);

  return { score: Math.min(99, score), reason: reasons.join(' · ') || 'مطابقة ضعيفة' };
}

function bestListingMatch(row: ContributionQueueRow): ListingMatch | null {
  const ranked = businesses
    .map((business) => ({ business, ...scoreBusiness(row, business) }))
    .filter((candidate) => candidate.score >= 45)
    .sort((a, b) => b.score - a.score || a.business.name.localeCompare(b.business.name, 'ar'));
  const best = ranked[0];
  if (!best) return null;
  return {
    slug: best.business.slug,
    name: best.business.name,
    locality: best.business.locality ? canonicalLocalityName(best.business.locality) : null,
    category: best.business.category,
    score: best.score,
    reason: best.reason,
  };
}

function isDuplicateCandidate(a: ContributionQueueRow, b: ContributionQueueRow) {
  if (a.id === b.id) return false;
  if (a.listingSlug && b.listingSlug && a.listingSlug === b.listingSlug) return true;
  const sameName = normalizeArabic(a.name) === normalizeArabic(b.name);
  if (!sameName) return false;
  const aLocality = normalizeArabic(a.locality);
  const bLocality = normalizeArabic(b.locality);
  if (aLocality && bLocality) return aLocality === bLocality;
  return normalizeArabic(a.category) === normalizeArabic(b.category);
}

function verificationState(row: ContributionQueueRow, match: ListingMatch | null): ReviewQueueItem['verificationState'] {
  if (row.sourceUrl && match?.score === 100) return 'قوي';
  if (row.sourceUrl && match && match.score >= 70) return 'جيد';
  if (row.sourceUrl) return 'مصدر فقط';
  if (match && match.score >= 65) return 'مطابقة فقط';
  return 'ناقص';
}

function priorityBand(score: number): ReviewQueueItem['priorityBand'] {
  if (score >= 100) return 'عاجل';
  if (score >= 80) return 'مرتفع';
  return 'عادي';
}

export function enrichContributionQueue(snapshot: ContributionQueueSnapshot): ReviewQueueItem[] {
  return snapshot.items.map((row) => {
    const listingMatch = bestListingMatch(row);
    const duplicates = snapshot.items.filter((candidate) => isDuplicateCandidate(row, candidate));
    return {
      ...row,
      priorityBand: priorityBand(row.reviewPriority),
      verificationState: verificationState(row, listingMatch),
      listingMatch,
      duplicateCount: duplicates.length,
      duplicateIds: duplicates.map((item) => item.id),
    };
  });
}
