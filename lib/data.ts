import businesses01 from '@/data/businesses-01.json';
import businesses02 from '@/data/businesses-02.json';
import businesses03 from '@/data/businesses-03.json';
import businesses04 from '@/data/businesses-04.json';
import catalog from '@/data/catalog.json';
import rawFamilies from '@/data/families.json';
import rawLandmarks from '@/data/landmarks.json';
import rawLocalities from '@/data/localities.json';
import rawPeople from '@/data/people.json';
import { normalizeRouteSlug, slugify } from './site';
import type { Business, Category, DirectoryItem, Family, Landmark, LocalityPage, LocalityRecord, PersonRecord } from './types';

export const businesses = [
  ...businesses01,
  ...businesses02,
  ...businesses03,
  ...businesses04,
] as Business[];

/**
 * Activity imports sometimes preserve useful parent context in locality strings,
 * for example "بشلاو / الأوسط قمولا". Public locality routes should always use
 * the first (most specific) segment so those records contribute to /villages/بشلاو
 * instead of creating a second pseudo-locality.
 */
export function canonicalLocalityName(value?: string | null) {
  const raw = value?.trim() || 'مركز نقادة';
  const primary = raw.split('/')[0]?.trim();
  return primary || raw;
}

export function parentLocalityName(locality?: string | null, explicitParent?: string | null) {
  if (explicitParent?.trim()) return explicitParent.trim();
  if (!locality?.includes('/')) return null;
  const parent = locality.split('/').slice(1).join('/').trim();
  return parent || null;
}

export const directoryBusinesses: DirectoryItem[] = businesses.map((item) => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  normalizedName: item.normalizedName,
  category: item.category,
  subcategory: item.subcategory,
  locality: canonicalLocalityName(item.locality),
  parentLocality: parentLocalityName(item.locality, item.parentLocality),
  address: item.address,
  phone: item.phone,
  rating: item.rating,
  reviews: item.reviews,
  mapsUrl: item.mapsUrl,
  verification: item.verification,
}));

export const families = rawFamilies as Family[];
export const people = rawPeople as PersonRecord[];
export const landmarks = rawLandmarks as Landmark[];
export const meta = catalog.meta;

const categoryDescriptions: Record<string, string> = {
  'الطب والصحة': 'أطباء وعيادات وصيدليات ومعامل وخدمات صحية.',
  'التجزئة والتسوق': 'متاجر وأسواق واحتياجات يومية داخل المركز.',
  'التعليم': 'مدارس ومراكز تدريب وخدمات تعليمية.',
  'المطاعم والأطعمة': 'مطاعم ومخابز ومقاهٍ ومنتجات غذائية.',
  'دور العبادة': 'مساجد وكنائس ودور عبادة مسجلة.',
  'البناء والصيانة': 'مقاولات وحرف وصيانة وتجهيزات منزلية.',
  'السيارات والنقل': 'نقل وورش وقطع غيار وخدمات سيارات.',
  'الإلكترونيات والهواتف': 'هواتف وإلكترونيات وصيانة وملحقات.',
  'الخدمات المهنية': 'محاماة ومحاسبة ومكاتب وخدمات متخصصة.',
  'الجمعيات والمجتمع': 'جمعيات ومؤسسات وأنشطة مجتمعية.',
  'الخدمات الحكومية': 'جهات ومكاتب ومرافق خدمية عامة.',
  'الخدمات المالية': 'بنوك ومدفوعات وخدمات مالية.',
  'الرياضة والمجتمع': 'مراكز شباب وأنشطة رياضية واجتماعية.',
  'المناسبات': 'قاعات وتجهيزات وخدمات المناسبات.',
  'التجميل والعناية': 'صالونات وعناية شخصية وتجميل.',
  'المعالم والتراث': 'معالم ومواقع مرتبطة بذاكرة المكان.',
  'الزراعة والأغذية': 'زراعة وإنتاج غذائي ومدخلات محلية.',
  'الأثاث والديكور': 'أثاث ومفروشات وديكور وتجهيز.',
  'الرياضة': 'ملاعب وأندية وخدمات رياضية.',
  'التعليم والرعاية': 'تعليم ورعاية وخدمات للأطفال.',
  'السياحة والنقل': 'رحلات وانتقالات وخدمات زوار.',
  'المعالم والترفيه': 'أماكن عامة وترفيه ومعالم محلية.',
};

const shortLabels: Record<string, string> = {
  'الطب والصحة': 'الصحة',
  'التجزئة والتسوق': 'التسوق',
  'المطاعم والأطعمة': 'المطاعم',
  'الإلكترونيات والهواتف': 'الإلكترونيات',
  'البناء والصيانة': 'البناء والصيانة',
  'الخدمات المهنية': 'المهنيون',
  'الخدمات الحكومية': 'الخدمات العامة',
  'الجمعيات والمجتمع': 'المجتمع',
};

export const categories: Category[] = catalog.categoryCounts.map((item) => ({
  name: item.name,
  slug: slugify(item.name),
  count: item.count,
  shortLabel: shortLabels[item.name] || item.name,
  description: categoryDescriptions[item.name] || `خدمات ${item.name} المنشورة في مركز نقادة.`,
}));

const countByLocality = new Map<string, number>();
for (const business of businesses) {
  const name = canonicalLocalityName(business.locality);
  countByLocality.set(name, (countByLocality.get(name) || 0) + 1);
}

const supplementalLocalities: LocalityRecord[] = [
  {
    name: 'دراو',
    type: 'نجع / منطقة',
    center: 'مركز نقادة',
    scope: 'الأوسط قمولا',
    verification: 'موثق بمصادر محلية',
    classification: 'تابع للأوسط قمولا',
    source: null,
    notes: 'دراو — الأوسط قمولا، مركز نقادة، قنا. موضع مستقل عن دراو بمحافظة أسوان.',
  },
  {
    name: 'أسمنت الصغيرة',
    type: 'نجع / موضع محلي',
    center: 'مركز نقادة',
    scope: 'أسمنت / الأوسط قمولا',
    verification: 'موثق بمصدر تاريخي ومحلي',
    classification: 'مرتبط بأسمنت ضمن الأوسط قمولا',
    source: null,
    notes: 'أسمنت الصغيرة — موضع غرب أسمنت الكبيرة ضمن الأوسط قمولا. سجل 1897 التاريخي يذكر 84 نسمة و18 مسكنًا؛ الرقم تاريخي لا يمثل الحاضر.',
  },
  {
    name: 'نجع الشروعة',
    type: 'نجع',
    center: 'مركز نقادة',
    scope: 'نجع القرية / الأوسط قمولا',
    verification: 'موثق بمصدر تاريخي محلي',
    classification: 'تابع لنجع القرية / الأوسط قمولا',
    source: null,
    notes: 'نجع الشروعة مذكور تاريخيًا ضمن نجع القرية والأوسط قمولا؛ الوضع الحديث الدقيق يحتاج مصدرًا مستقلًا.',
  },
  {
    name: 'نجع الغطاطسة',
    type: 'نجع',
    center: 'مركز نقادة',
    scope: 'نجع القرية / الأوسط قمولا',
    verification: 'موثق بمصدر تاريخي محلي',
    classification: 'تابع لنجع القرية / الأوسط قمولا',
    source: null,
    notes: 'نجع الغطاطسة مذكور تاريخيًا ضمن نجع القرية والأوسط قمولا؛ لا يخلط بمواضع تحمل الاسم خارج نقادة.',
  },
  {
    name: 'عزبة الأعوارية',
    type: 'عزبة',
    center: 'مركز نقادة',
    scope: 'نجع القرية / الأوسط قمولا',
    verification: 'موثق بمصدر تاريخي محلي',
    classification: 'تابعة لنجع القرية / الأوسط قمولا',
    source: null,
    notes: 'عزبة الأعوارية مذكورة تاريخيًا ضمن نجع القرية والأوسط قمولا؛ الحضور الرقمي الحديث المباشر محدود.',
  },
  {
    name: 'جزيرة أحمد سعد',
    type: 'جزيرة / موضع محلي',
    center: 'مركز نقادة',
    scope: 'نجع القرية / الأوسط قمولا',
    verification: 'موثق بمصدر تاريخي محلي',
    classification: 'تابعة لنجع القرية / الأوسط قمولا',
    source: null,
    notes: 'جزيرة أحمد سعد مذكورة تاريخيًا ضمن نجع القرية والأوسط قمولا. الاسم لا يثبت مؤسسًا أو عائلة دون مصدر مستقل.',
  },
  {
    name: 'نجع العوامر',
    type: 'نجع',
    center: 'مركز نقادة',
    scope: 'الأوسط قمولا',
    verification: 'موثق بمصدر تاريخي محلي',
    classification: 'ضمن الأوسط قمولا',
    source: null,
    notes: 'نجع العوامر مذكور تاريخيًا ضمن الأوسط قمولا. يوجد كيان خرائطي حديث باسم عزبة العوامر لكن العلاقة بين الاسمين غير محسومة.',
  },
  {
    name: 'عزبة كُتّي',
    type: 'عزبة',
    center: 'مركز نقادة',
    scope: 'الأوسط قمولا',
    verification: 'موثق بمصدر تاريخي محلي',
    classification: 'ضمن الأوسط قمولا',
    source: null,
    notes: 'عزبة كُتّي مذكورة تاريخيًا ضمن الأوسط قمولا. وجود شخص بلقب كُتّي في المصدر لا يثبت أنه مؤسس العزبة أو سبب تسميتها.',
  },
];

const localityByName = new Map((rawLocalities as LocalityRecord[]).map((item) => [item.name, item]));
const supplementalLocalityByName = new Map(supplementalLocalities.map((item) => [item.name, item]));
const localityNames = new Set<string>([
  ...(rawLocalities as LocalityRecord[]).map((item) => item.name),
  ...supplementalLocalities.map((item) => item.name),
  ...countByLocality.keys(),
]);

export const localities: LocalityPage[] = [...localityNames].map((name) => {
  const record = localityByName.get(name) || supplementalLocalityByName.get(name);
  return {
    name,
    slug: slugify(name),
    type: record?.type || 'نطاق محلي',
    center: record?.center || 'مركز نقادة',
    scope: record?.scope || null,
    verification: record?.verification || 'من بيانات الأنشطة',
    classification: record?.classification || 'نطاق خدمي',
    source: record?.source || null,
    notes: record?.notes || null,
    businessCount: countByLocality.get(name) || 0,
  };
}).sort((a, b) => b.businessCount - a.businessCount || a.name.localeCompare(b.name, 'ar'));

export const officialLocalities = localities.filter((item) => localityByName.has(item.name));
export const featuredBusinesses = [...businesses]
  .sort((a, b) => (b.reviews || 0) - (a.reviews || 0) || (b.rating || 0) - (a.rating || 0))
  .slice(0, 6);

export function getCategoryBySlug(slug: string) {
  const normalized = normalizeRouteSlug(slug);
  return categories.find((item) => item.slug === normalized);
}

export function getBusinessBySlug(slug: string) {
  const normalized = normalizeRouteSlug(slug);
  return businesses.find((item) => item.slug.toLowerCase() === normalized);
}

export function getLocalityBySlug(slug: string) {
  const normalized = normalizeRouteSlug(slug);
  return localities.find((item) => item.slug === normalized);
}

export function relatedBusinesses(business: Business, limit = 3) {
  const locality = canonicalLocalityName(business.locality);
  return businesses
    .filter((item) => item.id !== business.id && (canonicalLocalityName(item.locality) === locality || item.category === business.category))
    .sort((a, b) => Number(canonicalLocalityName(b.locality) === locality) - Number(canonicalLocalityName(a.locality) === locality) || (b.reviews || 0) - (a.reviews || 0))
    .slice(0, limit);
}
