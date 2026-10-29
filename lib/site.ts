import type { Metadata } from 'next';
import type { Business } from './types';
import { canonicalLocalityName } from './locality-name';

const configuredOrigin = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined;
const siteOrigin = configuredOrigin ? new URL(configuredOrigin).origin : 'https://naqada-directory.vercel.app';
if (!siteOrigin.startsWith('https://')) throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS');

export const siteConfig = {
  name: 'دليل الخدمات والأنشطة والقرى والنجوع | دليل نقادة',
  shortName: 'دليل نقادة',
  alternateNames: ['دليل مركز نقادة', 'دليل خدمات نقادة', 'موسوعة نقادة المحلية'],
  url: siteOrigin,
  locale: 'ar_EG',
  description: 'دليل نقادة هو الدليل المحلي للخدمات والأنشطة والقرى والنجوع في مركز نقادة بمحافظة قنا، ويضم أطباء وصيدليات ومدارس ومطاعم ومحلات وروابط وصول مباشرة.',
  socialImage: siteOrigin + '/images/social/naqada-share-v2.jpg',
  logoImage: siteOrigin + '/app-icons/icon-192.png',
};

export function pageTitle(value: string) {
  const suffix = ' | دليل نقادة';
  const core = value.replace(/^دليل نقادة\s*\|\s*/u, '').replace(/\s*\|\s*دليل نقادة\s*$/u, '').replace(/\s+/g, ' ').trim();
  let result = '';
  for (const word of core.split(' ')) {
    const next = result ? result + ' ' + word : word;
    if (next.length > 60 - suffix.length) break;
    result = next;
  }
  return (result || 'المعلومات والخدمات المحلية') + suffix;
}
export function pageDescription(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return siteConfig.description;
  const fuller = clean.length < 40
    ? 'معلومات ' + clean + ' في دليل نقادة، الدليل المحلي المستقل للخدمات والأنشطة والقرى والنجوع بمحافظة قنا. راجع التفاصيل وروابط الوصول والمصادر المنشورة، وشارك بالتصحيح.'
    : clean.length < 120 ? clean + ' تصفح المعلومات المنشورة وروابط الوصول ذات الصلة، وشارك بتصحيح موثق للمراجعة عند الحاجة.' : clean;
  return truncateMetaDescription(fuller, 155);
}

const defaultIndexRobots: Metadata['robots'] = {
  googleBot: {
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

export function absoluteUrl(path = '/') {
  const normalizedPath = canonicalPath(path);
  return normalizedPath === '/' ? `${siteConfig.url}/` : `${siteConfig.url}${normalizedPath}`;
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
  socialImage?: { url: string; alt?: string; width?: number; height?: number; type?: string };
  keywords?: string[];
}): Metadata {
  const normalizedPath = canonicalPath(path);
  const url = absoluteUrl(normalizedPath);
  const brandedTitle = pageTitle(title);
  const summary = pageDescription(description);
  const image = socialImage
    ? { ...socialImage, alt: socialImage.alt || title }
    : {
        url: siteConfig.socialImage,
        width: 1200,
        height: 630,
        alt: 'دليل نقادة — الموسوعة المحلية لمركز نقادة',
      };
  return {
    title: { absolute: brandedTitle },
    description: summary,
    // Only these anonymous public documents may be saved as explicit offline
    // snapshots. Account, moderation, claim and query responses stay excluded.
    ...(/^\/(?:listing|activity|villages|directory|activities|blog|role-models|knowledge|emergency)(?:\/[^/?]+){0,2}\/$/.test(normalizedPath)
      ? { other: { 'naqada-public-snapshot': 'anonymous' } } : {}),
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: normalizedPath },
    robots: robots ?? defaultIndexRobots,
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      title: brandedTitle,
      description: summary,
      siteName: siteConfig.shortName,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description: summary,
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
  if (!phone) return null;
  const ascii = phone.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0));
  const value = ascii.replace(/[^+\d]/g, '');
  if (/^0020\d{8,10}$/.test(value)) return '+' + value.slice(2);
  if (/^20(?:1[0125]\d{8}|[2-9]\d{7,8})$/.test(value)) return '+' + value;
  if (/^01[0125]\d{8}$/.test(value) || /^0[2-9]\d{7,8}$/.test(value)) return '+20' + value.slice(1);
  return value || null;
}

export function localityContext(value?: string | null) {
  const name = canonicalLocalityName(value);
  return /^مركز نقاد[ةه]$/u.test(name) ? 'مركز نقادة' : `${name} ضمن مركز نقادة`;
}

export function businessSummary(listing: Pick<Business, 'name' | 'category' | 'subcategory' | 'locality' | 'address' | 'phone' | 'mapsUrl' | 'checked'>) {
  const locality = localityContext(listing.locality);
  const kind = listing.subcategory || listing.category;
  const location = listing.address || `${locality}، محافظة قنا`;
  const access = listing.phone && listing.mapsUrl
    ? 'تتوفر في الصفحة وسيلة اتصال ورابط مباشر للخريطة.'
    : listing.phone
      ? 'تتوفر في الصفحة وسيلة اتصال منشورة.'
      : listing.mapsUrl
        ? 'يتوفر في الصفحة رابط مباشر لمراجعة الموقع على الخريطة.'
        : 'تعرض الصفحة بيانات السجل المنشورة في الدليل.';
  const review = listing.checked ? ` آخر مراجعة للبيانات: ${formatDate(listing.checked)}.` : '';
  return `${listing.name} — ${kind} في ${locality} بمحافظة قنا. العنوان المنشور: ${location}. ${access}${review}`;
}

export function truncateMetaDescription(value: string, maxLength = 155) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const candidate = normalized.slice(0, maxLength - 1);
  const boundary = candidate.lastIndexOf(' ');
  const end = boundary >= Math.floor(maxLength * 0.75) ? boundary : maxLength - 1;
  return `${candidate.slice(0, end).replace(/[،؛:,.…\-\s]+$/u, '')}…`;
}

export function whatsappUrl(phone: string | null) {
  const clean = cleanPhone(phone)?.replace(/^(?:\+|00)/, '');
  if (!clean) return null;
  const international = /^01[0125]\d{8}$/.test(clean) ? `20${clean.slice(1)}` : clean;
  return /^201[0125]\d{8}$/.test(international) ? `https://wa.me/${international}` : null;
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
