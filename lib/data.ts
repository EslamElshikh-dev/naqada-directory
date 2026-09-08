import businesses01 from '@/data/businesses-01.json';
import businesses02 from '@/data/businesses-02.json';
import businesses03 from '@/data/businesses-03.json';
import businesses04 from '@/data/businesses-04.json';
import businesses05 from '@/data/businesses-05.json';
import businesses06 from '@/data/businesses-06.json';
import businesses07 from '@/data/businesses-07.json';
import catalog from '@/data/catalog.json';
import rawFamilies from '@/data/families.json';
import rawLandmarks from '@/data/landmarks.json';
import rawLocalities from '@/data/localities.json';
import rawPeople from '@/data/people.json';
import { bashlawListingEnrichment } from './bashlaw-listing-enrichment';
import { normalizeRouteSlug, slugify } from './site';
import type { Business, Category, DirectoryItem, Family, Landmark, LocalityPage, LocalityRecord, PersonRecord } from './types';

const rawBusinesses = [
  ...businesses01,
  ...businesses02,
  ...businesses03,
  ...businesses04,
  ...businesses05,
  ...businesses06,
  ...businesses07,
] as Business[];

/**
 * Small, reviewable corrections for published records where the source data is
 * intentionally kept immutable. This prevents a one-off locality correction
 * from requiring a rewrite of a large imported dataset and keeps the reason for
 * the correction visible in code review.
 */
const businessOverrides: Record<string, Partial<Business>> = {
  'google:ChIJ5ZH736NHSRQRQ9Dbks_bZXc': {
    locality: 'ساحل بشلاو (الهواورة) / الأوسط قمولا',
    parentLocality: 'الأوسط قمولا',
    checked: '2026-09-06',
    notes: 'تصحيح جغرافي: العنوان والاسم يثبتان أن المسجد في ساحل بشلاو، وليس داخل بشلاو نفسها.',
  },
  'directory:bashlaw-alhoot-metalworks': {
    address: 'نجع بشلاو، الأوسط قمولا، مركز نقادة، قنا',
    phone: '+201060291767',
    rating: 5,
    reviews: 1,
    hours: 'مفتوح 24 ساعة يوميًا',
    mapsUrl: 'https://www.google.com/maps/?cid=1787744057810019796',
    checked: '2026-09-07',
    notes: 'تحديث تحقق 2026-09-07: BizMidEast وCybo متفقان على الهاتف وساعات العمل والتصنيف، وCybo يعرض 5/5 من مراجعة واحدة. حُذف Plus Code من العنوان المنشور لأن المصدرين يعرضان كودين مختلفين مع اتفاقهما على نجع بشلاو والأوسط قمولا.',
  },
  'directory:bashlaw-waleed-barber': {
    rating: 3.5,
    reviews: 2,
    checked: '2026-09-07',
    notes: 'تحديث تحقق 2026-09-07: Cybo يطابق الاسم والعنوان على المدخل الرئيسي لقرية بشلاو ويعرض تقييم 3.5/5 من مراجعتين. لم تُضف صورة لأن نتائج الصور المطابقة للاسم من خارج بشلاو رُفضت.',
  },
  'directory:bashlaw-mahmoud-barber': {
    rating: 3,
    reviews: 3,
    checked: '2026-09-07',
    notes: 'تحديث تحقق 2026-09-07: Cybo يطابق الاسم والعنوان في شارع مدرسة عمر بن الخطاب ببشلاو ويعرض تقييم 3/5 من 3 مراجعات. لا توجد صورة محلية موثقة مضافة.',
  },
};

export const businesses = rawBusinesses.map((item) => {
  const enrichment = bashlawListingEnrichment[item.id];
  const override = businessOverrides[item.id];
  return enrichment || override ? { ...item, ...enrichment, ...override } : item;
});

const canonicalLocalityAliases: Record<string, string> = {
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

const countByCategory = new Map<string, number>();
for (const business of businesses) {
  countByCategory.set(business.category, (countByCategory.get(business.category) || 0) + 1);
}

export const categories: Category[] = catalog.categoryCounts.map((item) => ({
  name: item.name,
  slug: slugify(item.name),
  count: countByCategory.get(item.name) ?? item.count,
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
  {
    name: 'عزبة علي عبيد',
    type: 'عزبة',
    center: 'مركز نقادة',
    scope: 'بشلاو / الأوسط قمولا (2014)',
    verification: 'موثق في تصنيف 2014',
    classification: 'تابعة تاريخيًا لبشلاو / الوضع الحديث غير محسوم',
    source: null,
    notes: 'عزبة علي عبيد مثبتة ضمن توابع بشلاو في تصنيف 2014؛ الاسم غير ظاهر في قائمة أحوزة 2026 المنشورة، ولا يثبت ذلك الإلغاء أو إعادة التسمية.',
  },
  {
    name: 'عزبة طايل',
    type: 'عزبة',
    center: 'مركز نقادة',
    scope: 'نجع القرية / الأوسط قمولا',
    verification: 'موثق تاريخيًا وحديثًا',
    classification: 'ضمن نطاق نجع القرية / الأوسط قمولا',
    source: null,
    notes: 'عزبة طايل موضع مستقل عن عزبة طايع. موثق بها آل طايل ومسجد الرحمة ونشاط تحفيظ قرآن.',
  },
  {
    name: 'عزبة طايع',
    type: 'عزبة',
    center: 'مركز نقادة',
    scope: 'الأوسط قمولا تاريخيًا / وحدة البحري قمولا حديثًا',
    verification: 'موثق تاريخيًا وحديثًا',
    classification: 'موضع قائم مع حذر في القرية الأم الحديثة',
    source: null,
    notes: 'عزبة طايع موضع مستقل عن عزبة طايل. مدرجة في أحوزة 2026، مع إشارات حديثة متعارضة حول القرية الأم الدقيقة.',
  },
  {
    name: 'عزبة المصري',
    type: 'عزبة',
    center: 'مركز نقادة',
    scope: 'بشلاو / الأوسط قمولا (2014)؛ وحدة البحري قمولا (2026)',
    verification: 'موثق تاريخيًا وحديثًا',
    classification: 'موضع قائم / القرية الأم الحالية غير محسومة',
    source: null,
    notes: 'عزبة المصري ظهرت ضمن توابع بشلاو في 2014 وما زالت مدرجة في أحوزة 2026 داخل الوحدة المحلية للبحري قمولا.',
  },
  {
    name: 'عزبة عبدالكريم',
    type: 'عزبة',
    center: 'مركز نقادة',
    scope: 'نجع القرية / الأوسط قمولا',
    verification: 'موثق بمصادر أوقاف وخدمات حديثة',
    classification: 'ضمن نطاق نجع القرية / الأوسط قمولا',
    source: null,
    notes: 'عزبة عبدالكريم موضع قائم ضمن نطاق نجع القرية، ولها اسم خدمي مستقل ومسجد موثق جرى تطويره وافتتاحه في 2026.',
  },
  {
    name: 'جزيرة جبر',
    type: 'جزيرة نيلية',
    center: 'مركز نقادة',
    scope: 'بشلاو / الأوسط قمولا',
    verification: 'موثق تاريخيًا وحديثًا',
    classification: 'جزيرة مستقلة مرتبطة تاريخيًا واجتماعيًا ببشلاو',
    source: null,
    notes: 'جزيرة جبر جزيرة نيلية مستقلة عن عزبة جبر. توجد إشارة عائلية مباشرة لآل يونس بالجزيرة مع منع استنتاج صلات نسبية غير موثقة.',
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

export const meta = {
  ...catalog.meta,
  businessCount: businesses.length,
  localityCount: localities.length,
};

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

export function getCanonicalLocalitySlugAlias(slug: string) {
  const normalized = normalizeRouteSlug(slug);
  const alias = Object.entries(canonicalLocalityAliases).find(([name]) => slugify(name) === normalized);
  return alias ? slugify(alias[1]) : null;
}

export function relatedBusinesses(business: Business, limit = 3) {
  const locality = canonicalLocalityName(business.locality);
  return businesses
    .filter((item) => item.id !== business.id && (canonicalLocalityName(item.locality) === locality || item.category === business.category))
    .sort((a, b) => Number(canonicalLocalityName(b.locality) === locality) - Number(canonicalLocalityName(a.locality) === locality) || (b.reviews || 0) - (a.reviews || 0))
    .slice(0, limit);
}