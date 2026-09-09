import { normalizeArabic } from './site';

export type SearchRankingFields = {
  title: string;
  category?: string | null;
  subcategory?: string | null;
  locality?: string | null;
  address?: string | null;
  auxiliary?: string | null;
};

export type NormalizedSearchFields = {
  title: string;
  category: string;
  subcategory: string;
  locality: string;
  address: string;
  auxiliary: string;
  all: string;
};

const synonymGroups = [
  ['دكتور', 'طبيب', 'عياده'],
  ['دكتوره', 'طبيبه', 'عياده'],
  ['موبايل', 'محمول', 'تليفون', 'تلفون', 'هاتف', 'هواتف'],
  ['حضانه', 'حضانات'],
  ['معمل', 'معامل', 'مختبر', 'تحاليل'],
  ['نجار', 'نجاره'],
  ['كوافير', 'صالون', 'تجميل'],
] as const;

const synonymMap = new Map<string, string[]>();
for (const group of synonymGroups) {
  const normalizedGroup = [...new Set(group.map((value) => normalizeArabic(value)))];
  for (const token of normalizedGroup) synonymMap.set(token, normalizedGroup);
}

function normalizeField(value?: string | null) {
  return normalizeArabic(value || '');
}

export function prepareSearchQuery(value: string) {
  const normalizedQuery = normalizeArabic(value);
  return { normalizedQuery, tokens: normalizedQuery.split(' ').filter(Boolean) };
}

export function normalizeSearchFields(fields: SearchRankingFields): NormalizedSearchFields {
  const normalized = {
    title: normalizeField(fields.title),
    category: normalizeField(fields.category),
    subcategory: normalizeField(fields.subcategory),
    locality: normalizeField(fields.locality),
    address: normalizeField(fields.address),
    auxiliary: normalizeField(fields.auxiliary),
    all: '',
  };
  normalized.all = [normalized.title, normalized.category, normalized.subcategory, normalized.locality, normalized.address, normalized.auxiliary].filter(Boolean).join(' ');
  return normalized;
}

function variantsFor(token: string) {
  return synonymMap.get(token) || [token];
}

function fieldScore(field: string, variants: string[], exactWeight: number, prefixWeight: number, containsWeight: number) {
  let best = 0;
  for (const variant of variants) {
    if (!variant || !field) continue;
    if (field === variant) best = Math.max(best, exactWeight);
    else if (field.startsWith(`${variant} `) || field.startsWith(variant)) best = Math.max(best, prefixWeight);
    else if (` ${field} `.includes(` ${variant} `)) best = Math.max(best, Math.round((prefixWeight + containsWeight) / 2));
    else if (field.includes(variant)) best = Math.max(best, containsWeight);
  }
  return best;
}

export function scoreNormalizedSearchFields(normalized: NormalizedSearchFields, normalizedQuery: string, tokens: string[]) {
  if (!tokens.length) return 0;
  let score = 0;

  if (normalized.title === normalizedQuery) score += 240;
  else if (normalized.title.startsWith(normalizedQuery)) score += 150;
  else if (normalized.title.includes(normalizedQuery)) score += 105;

  if (normalized.locality === normalizedQuery) score += 180;
  else if (normalized.locality.startsWith(normalizedQuery)) score += 95;
  else if (normalized.locality.includes(normalizedQuery)) score += 60;

  if (normalized.subcategory === normalizedQuery) score += 150;
  else if (normalized.subcategory.includes(normalizedQuery)) score += 75;

  if (normalized.category === normalizedQuery) score += 135;
  else if (normalized.category.includes(normalizedQuery)) score += 65;

  if (normalized.all.includes(normalizedQuery)) score += 32;

  for (const token of tokens) {
    const variants = variantsFor(token);
    const title = fieldScore(normalized.title, variants, 54, 38, 25);
    const subcategory = fieldScore(normalized.subcategory, variants, 38, 28, 18);
    const category = fieldScore(normalized.category, variants, 34, 24, 16);
    const locality = fieldScore(normalized.locality, variants, 38, 28, 18);
    const address = fieldScore(normalized.address, variants, 15, 10, 6);
    const auxiliary = fieldScore(normalized.auxiliary, variants, 14, 9, 5);
    const best = Math.max(title, subcategory, category, locality, address, auxiliary);
    if (!best) return -1;
    score += best + Math.round((title + subcategory + category + locality) * 0.12);
  }

  if (tokens.length > 1 && tokens.every((token) => normalized.title.includes(token))) score += 35;
  return score;
}

export function rankSearchFields(fields: SearchRankingFields, query: string) {
  const { normalizedQuery, tokens } = prepareSearchQuery(query);
  if (!tokens.length) return 0;
  return scoreNormalizedSearchFields(normalizeSearchFields(fields), normalizedQuery, tokens);
}
