export const siteConfig = {
  name: 'دليل نقادة | الموسوعة المحلية لمركز نقادة',
  shortName: 'دليل نقادة',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://naqada-directory.vercel.app',
  locale: 'ar_EG',
  description: 'دليل محلي منظم لخدمات وقرى وعائلات وأعلام ومعالم مركز نقادة بمحافظة قنا، مع روابط وصول مباشرة ومنهج توثيق واضح.',
};

export function normalizeArabic(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function slugify(value: string) {
  return normalizeArabic(value).replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function normalizeRouteSlug(value: string) {
  try {
    return decodeURIComponent(value).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

export function cleanPhone(phone: string | null) {
  return phone?.replace(/[^+\d]/g, '') || null;
}

export function whatsappUrl(phone: string | null) {
  const clean = cleanPhone(phone)?.replace(/^\+/, '');
  return clean?.startsWith('201') && clean.length === 12 ? `https://wa.me/${clean}` : null;
}

export function isSafeExternalUrl(url: string | null) {
  return Boolean(url && /^https:\/\//i.test(url));
}

export function verificationLabel(value: string | null) {
  const labels: Record<string, string> = {
    A: 'موثق بدرجة A',
    'A/B': 'موثق بدرجة A/B',
    'B+': 'موثق بدرجة B+',
    B: 'موثق بدرجة B',
  };
  return labels[value || ''] || 'بيانات منشورة بعد المراجعة';
}

export function formatDate(value: string | null) {
  if (!value) return 'غير محدد';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
