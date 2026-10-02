import { isFamilySearchQuery } from './family-search';
import { prepareSearchQuery } from './search-ranking';

export type SearchGapResearch = {
  checked: string;
  summary: string;
  needed: string;
  relatedQuery?: string;
  sources: { label: string; url: string }[];
};

export function getSearchGapResearch(query: string): SearchGapResearch | null {
  const normalized = prepareSearchQuery(query).normalizedQuery;
  const checked = '2026-10-02';
  if (isFamilySearchQuery(query) && normalized.includes('طوخ')) return {
    checked,
    summary: 'أضيف سجل جزئي لآل سيد حصاوي في طوخ، من تغطية مناسبة عائلية سنة 2021. البحث يفتح سجلات طوخ مباشرة.',
    needed: 'يلزم مصدر منشور لكل عائلة إضافية؛ التغطية لا تمثل حصرًا لعائلات طوخ ولا تثبت الأنساب.',
    sources: [{ label: 'التغطية الأصلية', url: 'https://www.youtube.com/watch?v=bLMpImOsnE8' }],
  };
  if (/اولاد الشيخ|ابو الشيخ/u.test(normalized) && /قماش|اقمشه/u.test(normalized)) return {
    checked,
    summary: 'الموجود باسم أولاد الشيخ في الدليل محل دهانات. لم تتوفر مطابقة موثقة لمحل القماش بالاسم المطلوب، ولم نربطه بمحل الدهانات.',
    needed: 'اسم المحل كما على اللافتة، والقرية أو الشارع، ورابط صفحته أو وسيلة تواصل منشورة.',
    sources: [],
  };
  if (normalized === 'عاطف' || /(?:دكتور|طبيب|عياده) عاطف/u.test(normalized)) return {
    checked,
    summary: 'ظهرت أسماء أطباء تحمل عاطف في مدينة قنا، دون دليل يحدد عيادة الطبيب المقصود داخل نقادة.',
    needed: 'الاسم الكامل والتخصص وعنوان عيادة نقادة أو رابط صفحة الطبيب.',
    sources: [],
  };
  if (/مستشفي|مستشفى/u.test(normalized) && /تخصصي/u.test(normalized)) return {
    checked,
    summary: 'يوجد في الدليل مستشفى النيل بنقادة ومستشفى نقادة المركزي. لم يتأكد سجل داخل نقادة باسم «مستشفى تخصصي» يطابق المقصود.',
    needed: 'اسم المستشفى أو التخصص المطلوب والموضع، مع مصدر مباشر للخدمة.',
    relatedQuery: 'مستشفى', sources: [],
  };
  if (/تابلت/u.test(normalized) && /مدرسه/u.test(normalized)) return {
    checked,
    summary: 'لم يتوفر مصدر منشور يثبت أن محلًا في نقادة يشتري تابلت المدرسة. وجود محل موبايلات لا يثبت تقديم هذه الخدمة.',
    needed: 'اسم المحل وعنوانه وإعلان منشور يوضح خدمة الشراء وشروطها.',
    sources: [],
  };
  if (/اسواق المدينه/u.test(normalized)) return {
    checked,
    summary: 'أضيف سنتر المدينة للمفروشات والملابس والأدوات المنزلية بعنوان ورقم منشورين من النشاط. لا يوجد دليل أن «أسواق المدينة» اسم آخر له.',
    needed: 'تأكيد هل المقصود سنتر المدينة أم نشاط مستقل باسم أسواق المدينة، مع عنوانه أو صفحته.',
    relatedQuery: 'سنتر المدينة',
    sources: [{ label: 'قناة سنتر المدينة', url: 'https://t.me/centr_almadina' }],
  };
  if (/البراق/u.test(normalized)) return {
    checked,
    summary: 'أضيف البراق للأدوات الكهربائية في الخطارة وفق صفحة النشاط. البيانات المفهرسة قديمة، والمعلمان المذكوران في الوصف والمنشور مختلفان؛ نُشر اسم القرية فقط.',
    needed: 'تأكيد استمرار النشاط والعنوان التفصيلي ورقم التواصل الحالي من صاحبه.',
    sources: [{ label: 'صفحة البراق', url: 'https://www.facebook.com/people/البراق-للأدوات-الكهربائية/100094033270113/' }],
  };
  return null;
}
