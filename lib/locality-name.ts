export const canonicalLocalityAliases: Record<string, string> = {
  'كوم الضبع': 'نجع كوم الضبع',
  'شرق الترعة': 'نجع شرق الترعة',
};

/**
 * Activity imports sometimes preserve useful parent context in locality strings,
 * for example "بشلاو / الأوسط قمولا". Public locality routes should always use
 * the first (most specific) segment so those records contribute to /villages/بشلاو
 * instead of creating a second pseudo-locality.
 */
export function canonicalLocalityName(value?: string | null) {
  const raw = value?.trim() || 'مركز نقادة';
  const primary = raw.split('/')[0]?.trim();
  const name = primary || raw;
  return canonicalLocalityAliases[name] || name;
}

