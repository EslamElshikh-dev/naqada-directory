import type { Business } from './types';
import { cleanPhone, normalizeArabic } from './site';
import { canonicalLocalityName } from './locality-name';
export function duplicateBusiness(items: Business[], candidate: { name: string; phone: string; locality: string }, excludeId?: string) {
  const phone = cleanPhone(candidate.phone);
  if (!phone) return undefined;
  return items.find(item => item.id.replace(/^owner[:-]/, '') !== excludeId
    && cleanPhone(item.phone) === phone
    && normalizeArabic(item.name) === normalizeArabic(candidate.name)
    && normalizeArabic(canonicalLocalityName(item.locality)) === normalizeArabic(canonicalLocalityName(candidate.locality)));
}
