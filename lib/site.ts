import type { Metadata } from 'next';
import type { Business } from './types';

export const siteConfig = {
  name: 'دليل نقادة | دليل الخدمات والأنشطة والقرى والنجوع',
  shortName: 'دليل نقادة',
  alternateNames: ['دليل مركز نقادة', 'دليل خدمات نقادة', 'موسوعة نقادة المحلية'],
  url: 'https://naqada-directory.vercel.app',
  locale: 'ar_EG',
  description: 'دليل نقادة هو الدليل المحلي للخدمات والأنشطة والقرى والنجوع في مركز نقادة بمحافظة قنا، ويضم أطباء وصيدليات ومدارس ومطاعم ومحلات وروابط وصول مباشرة.',
  socialImage: 'https://naqada-directory.vercel.app/social-card',
  logoImage: 'https://naqada-directory.vercel.app/pwa-icon-192',
};

const defaultIndexRobots: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

export function canonicalPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath === '/') return '/';
  return `${normalizedPath.replace(/\/+$/, '')}/`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  robots,
  socialImage,
  keywords,
}: {
  title: string;
  description: string;
  path: string;
  robots?: Metadata['robots'];
  socialImage?: { url: string; alt?: string };
  keywords?: string[];
}): Metadata {
  const normalizedPath = canonicalPath(path);
  const url = normalizedPath === '/' ? `${siteConfig.url}/` : `${siteConfig.url}${normalizedPath}`;
  const image = socialImage
    ? { url: socialImage.url, alt: socialImage.alt || title }
    : {
        url: siteConfig.socialImage,
        width: 1200,
        height: 630,
        alt: 'دليل نقادة — الموسوعة المحلية لمركز نقادة',
      };
  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: normalizedPath },
    robots: robots ?? defaultIndexRobots,
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      title,
      description,
      siteName: siteConfig.shortName,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage?.url || siteConfig.socialImage],
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

export function businessSummary(listing: Pick<Business, 'name' | 'category' | 'subcategory' | 'locality' | 'address' | 'phone' | 'mapsUrl' | 'checked'>) {
  const locality = listing.locality?.split('/')[0]?.trim() || 'مركز نقادة';
  const kind = listing.subcategory || listing.category;
  const location = listing.address || `${locality}، مركز نقادة، محافظة قنا`;
  const access = listing.phone && listing.mapsUrl
    ? 'تتوفر في الصفحة وسيلة اتصال ورابط مباشر للخريطة.'
    : listing.phone
      ? 'تتوفر في الصفحة وسيلة اتصال منشورة.'
      : listing.mapsUrl
        ? 'يتوفر في الصفحة رابط مباشر لمراجعة الموقع على الخريطة.'
        : 'تعرض الصفحة بيانات السجل المنشورة في الدليل.';
  const review = listing.checked ? ` آخر مراجعة للبيانات: ${formatDate(listing.checked)}.` : '';
  return `${listing.name} — ${kind} في ${locality} ضمن مركز نقادة بمحافظة قنا. العنوان المنشور: ${location}. ${access}${review}`;
}

export function truncateMetaDescription(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const candidate = normalized.slice(0, maxLength + 1);
  const boundary = candidate.lastIndexOf(' ');
  const end = boundary >= Math.floor(maxLength * 0.75) ? boundary : maxLength;
  return `${candidate.slice(0, end).replace(/[،؛:,.…\-\s]+$/u, '')}…`;
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
