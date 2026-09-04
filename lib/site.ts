import type { Metadata } from 'next';
import type { Business } from './types';

export const siteConfig = {
  name: 'دليل نقادة | الموسوعة المحلية لمركز نقادة',
  shortName: 'دليل نقادة',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://naqada-directory.vercel.app',
  locale: 'ar_EG',
  description: 'دليل محلي منظم لخدمات وقرى وعائلات وأعلام ومعالم مركز نقادة بمحافظة قنا، مع روابط وصول مباشرة ومنهج توثيق واضح.',
};

export function buildPageMetadata({
  title,
  description,
  path,
  robots,
}: {
  title: string;
  description: string;
  path: string;
  robots?: Metadata['robots'];
}): Metadata {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = normalizedPath === '/' ? siteConfig.url : `${siteConfig.url}${normalizedPath}`;
  return {
    title,
    description,
    alternates: { canonical: normalizedPath },
    robots,
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      title,
      description,
      siteName: siteConfig.shortName,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

/** Escape characters that can terminate an inline script while preserving JSON semantics. */
export function jsonLdStringify(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function schemaTypeForBusiness(listing: Pick<Business, 'category' | 'subcategory' | 'name'>) {
  const text = `${listing.subcategory || ''} ${listing.name}`;

  if (listing.category === 'الطب والصحة') {
    if (/مستشفى|مستشفي/.test(text)) return 'Hospital';
    if (/صيدلي/.test(text)) return 'Pharmacy';
    if (/اسنان|أسنان/.test(text)) return 'Dentist';
    if (/عياد/.test(text)) return 'MedicalClinic';
    return 'MedicalBusiness';
  }
  if (listing.category === 'المطاعم والأطعمة') {
    if (/مخبز|مخبوز|حلوان/.test(text)) return 'Bakery';
    if (/كافيه|مقهى|قهو/.test(text)) return 'CafeOrCoffeeShop';
    return 'Restaurant';
  }
  if (listing.category === 'التعليم' || listing.category === 'التعليم والرعاية') return 'EducationalOrganization';
  if (listing.category === 'دور العبادة') return 'PlaceOfWorship';
  if (listing.category === 'الخدمات الحكومية') return 'GovernmentOffice';
  if (listing.category === 'الخدمات المالية') return 'FinancialService';
  if (listing.category === 'البناء والصيانة') return 'HomeAndConstructionBusiness';
  if (listing.category === 'السيارات والنقل') return 'AutomotiveBusiness';
  if (listing.category === 'الخدمات المهنية') return 'ProfessionalService';
  if (listing.category === 'التجميل والعناية') return 'HealthAndBeautyBusiness';
  if (listing.category === 'المناسبات') return 'EventVenue';
  if (listing.category === 'الرياضة' || listing.category === 'الرياضة والمجتمع') return 'SportsActivityLocation';
  if (listing.category === 'الجمعيات والمجتمع') return 'Organization';
  if (listing.category === 'المعالم والتراث' || listing.category === 'المعالم والترفيه') return 'Place';
  if (listing.category === 'التجزئة والتسوق' || listing.category === 'الإلكترونيات والهواتف' || listing.category === 'الأثاث والديكور') return 'Store';

  return 'LocalBusiness';
}

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
