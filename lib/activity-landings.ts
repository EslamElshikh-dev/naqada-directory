import { businesses } from './data';
import { normalizeRouteSlug, slugify } from './site';
import type { Business } from './types';

export type ActivityLanding = {
  name: string;
  slug: string;
  searchLabel: string;
  description: string;
  visualCategory: string;
  subcategories?: string[];
  categories?: string[];
};

type ActivityDefinition = Omit<ActivityLanding, 'slug'>;

const definitions: ActivityDefinition[] = [
  {
    name: 'صيدليات نقادة',
    searchLabel: 'صيدلية',
    description: 'دليل الصيدليات المنشورة في مدينة نقادة وقراها ونجوعها، مع العنوان والهاتف ورابط الخريطة حسب البيانات المتاحة.',
    visualCategory: 'الطب والصحة',
    subcategories: ['صيدلية'],
  },
  {
    name: 'مساجد نقادة',
    searchLabel: 'مسجد',
    description: 'دليل المساجد ودور العبادة الإسلامية المسجلة في مركز نقادة، من المدينة إلى القرى والنجوع التابعة.',
    visualCategory: 'دور العبادة',
    subcategories: ['مسجد', 'مسجد / مكان عبادة'],
  },
  {
    name: 'مدارس ومعاهد نقادة',
    searchLabel: 'مدرسة',
    description: 'دليل المدارس والمعاهد ومراكز التعليم المنشورة في مركز نقادة، مصنفًا حسب الاسم والقرية أو النجع.',
    visualCategory: 'التعليم',
    subcategories: ['مدرسة ابتدائية', 'مدرسة إعدادية', 'مدرسة ثانوية', 'مدرسة ثانوية فنية', 'مدرسة ابتدائية إعدادية', 'معهد أزهري', 'معهد ديني ابتدائي', 'مركز تعليمي', 'مركز تدريب'],
  },
  {
    name: 'سوبر ماركت وبقالات نقادة',
    searchLabel: 'سوبر ماركت',
    description: 'محلات السوبر ماركت والبقالة والمواد الغذائية المنشورة في نقادة وقراها، مع صفحات مستقلة لكل نشاط.',
    visualCategory: 'التجزئة والتسوق',
    subcategories: ['سوبرماركت', 'سوبر ماركت', 'سوبرماركت / جملة', 'بقالة', 'بقالة وتوزيع', 'متجر عام', 'تجارة جملة مواد غذائية'],
  },
  {
    name: 'محلات وأسواق نقادة',
    searchLabel: 'محلات',
    description: 'دليل محلات الملابس والأحذية والمجوهرات والأدوات المنزلية والعطارة وبقية متاجر التجزئة المنشورة في مركز نقادة.',
    visualCategory: 'التجزئة والتسوق',
    categories: ['التجزئة والتسوق'],
  },
  {
    name: 'مطاعم ومقاهي نقادة',
    searchLabel: 'مطعم',
    description: 'دليل المطاعم والمقاهي ومحلات الأطعمة الجاهزة المنشورة داخل مركز نقادة والمواضع التابعة له.',
    visualCategory: 'المطاعم والأطعمة',
    subcategories: ['مطعم', 'مقهى', 'فول وفلافل', 'مطعم كشري', 'مطعم فلافل'],
  },
  {
    name: 'مخابز وحلويات نقادة',
    searchLabel: 'مخبز',
    description: 'دليل المخابز ومحلات الحلويات والعصائر المنشورة في مدينة نقادة وقراها ونجوعها.',
    visualCategory: 'المطاعم والأطعمة',
    subcategories: ['مخبز', 'مخبز بلدي', 'مخبز جملة', 'حلويات وتورت', 'عصائر وحلويات'],
  },
  {
    name: 'أطباء وعيادات نقادة',
    searchLabel: 'طبيب',
    description: 'دليل الأطباء والعيادات والتخصصات الطبية المنشورة في نقادة، مع بيانات المكان والوصول المتاحة لكل سجل.',
    visualCategory: 'الطب والصحة',
    subcategories: ['عيادة طبية', 'طب أطفال', 'طب أطفال وحديثي الولادة', 'باطنة', 'جلدية', 'عظام', 'علاج طبيعي', 'عيون', 'حضانة أطفال طبية', 'مركز أشعة', 'مركز أسنان وأطفال', 'مركز أسنان', 'عيادة أسنان', 'طبيب أسنان'],
  },
  {
    name: 'نظارات وبصريات في نقادة',
    searchLabel: 'بصريات',
    description: 'دليل محلات النظارات والبصريات المنشورة في مركز نقادة، مع الاسم والعنوان ورابط الخريطة وبيانات التواصل المتاحة.',
    visualCategory: 'الطب والصحة',
    subcategories: ['بصريات'],
  },
  {
    name: 'مستشفيات ووحدات صحية في نقادة',
    searchLabel: 'مستشفى',
    description: 'المستشفيات والوحدات الصحية المنشورة ضمن نطاق مركز نقادة، مع العناوين وروابط الخرائط المتاحة.',
    visualCategory: 'الطب والصحة',
    subcategories: ['مستشفى', 'وحدة صحية'],
  },
  {
    name: 'معامل تحاليل في نقادة',
    searchLabel: 'معمل تحاليل',
    description: 'دليل معامل ومختبرات التحاليل الطبية المنشورة في نقادة مع بيانات الوصول المتاحة في الدليل.',
    visualCategory: 'الطب والصحة',
    subcategories: ['مختبر تحاليل', 'مختبر طبي'],
  },
  {
    name: 'بنوك وماكينات صراف في نقادة',
    searchLabel: 'بنك',
    description: 'دليل البنوك وماكينات الصراف الآلي المنشورة في مدينة نقادة وقراها، مع العنوان ورابط الوصول.',
    visualCategory: 'الخدمات المالية',
    subcategories: ['بنك', 'ماكينة صراف آلي'],
  },
  {
    name: 'محلات موبايلات وكمبيوتر في نقادة',
    searchLabel: 'موبايلات',
    description: 'دليل محلات الهواتف والكمبيوتر والإلكترونيات وخدمات الصيانة المنشورة في مركز نقادة.',
    visualCategory: 'الإلكترونيات والهواتف',
    subcategories: ['متجر وصيانة هواتف', 'إصلاح هواتف جوالة', 'خدمات محمول', 'متجر أجهزة كمبيوتر', 'دعم كمبيوتر وإنترنت', 'كمبيوتر ومحمول', 'كمبيوتر وإلكترونيات', 'إلكترونيات'],
  },
  {
    name: 'مواد بناء وتشطيبات في نقادة',
    searchLabel: 'مواد بناء',
    description: 'دليل محلات مواد البناء والسباكة والكهرباء والسيراميك والمقاولات المنشورة في مركز نقادة.',
    visualCategory: 'البناء والصيانة',
    subcategories: ['مواد بناء', 'مواد بناء وبويات', 'مستلزمات سباكة', 'سيراميك', 'حديد وبويات', 'مقاولات واستشارات هندسية', 'سيراميك وأدوات صحية', 'شركة إنشاء ومقاولات', 'أدوات وأجهزة كهربائية', 'توريدات وتركيبات'],
  },
  {
    name: 'حلاقون وصالونات في نقادة',
    searchLabel: 'حلاق',
    description: 'دليل الحلاقين وصالونات التجميل والعناية الشخصية المنشورة داخل مركز نقادة.',
    visualCategory: 'التجميل والعناية',
    subcategories: ['حلاق رجالي', 'صالون تجميل'],
  },
  {
    name: 'قاعات أفراح ومناسبات في نقادة',
    searchLabel: 'قاعة أفراح',
    description: 'دليل قاعات الأفراح والحفلات وخدمات المناسبات المنشورة في مدينة نقادة والقرى التابعة.',
    visualCategory: 'المناسبات',
    subcategories: ['قاعة زفاف', 'قاعة حفلات', 'خدمة إعداد زفاف / قاعة'],
  },
  {
    name: 'كنائس وأديرة نقادة',
    searchLabel: 'كنيسة',
    description: 'دليل الكنائس والأديرة والكاتدرائيات المسجلة في مركز نقادة وقراه، مع موضع كل سجل.',
    visualCategory: 'دور العبادة',
    subcategories: ['دير', 'كنيسة', 'كاتدرائية'],
  },
  {
    name: 'مراكز شباب وأندية نقادة',
    searchLabel: 'مركز شباب',
    description: 'دليل مراكز الشباب والأندية والصالات الرياضية المنشورة في نقادة وقراها ونجوعها.',
    visualCategory: 'الرياضة والمجتمع',
    subcategories: ['نادي رياضي', 'مركز شباب', 'مركز شباب / مجمع رياضي', 'صالة رياضية', 'نادي اجتماعي ورياضي'],
  },
  {
    name: 'خدمات السيارات والموتوسيكلات في نقادة',
    searchLabel: 'خدمات سيارات',
    description: 'دليل خدمات السيارات والموتوسيكلات وقطع الغيار والغسيل والنقل المنشورة في مركز نقادة.',
    visualCategory: 'السيارات والنقل',
    categories: ['السيارات والنقل'],
  },
  {
    name: 'جمعيات ومؤسسات نقادة',
    searchLabel: 'جمعية',
    description: 'دليل الجمعيات والمؤسسات والمراكز المجتمعية المنشورة في مدينة نقادة وقراها ونجوعها.',
    visualCategory: 'الجمعيات والمجتمع',
    categories: ['الجمعيات والمجتمع'],
  },
  {
    name: 'مصالح وخدمات حكومية في نقادة',
    searchLabel: 'خدمة حكومية',
    description: 'دليل المصالح والمكاتب والمرافق الحكومية المنشورة داخل نطاق مركز نقادة بمحافظة قنا.',
    visualCategory: 'الخدمات الحكومية',
    categories: ['الخدمات الحكومية'],
  },
];

export const activityLandings: ActivityLanding[] = definitions.map((item) => ({
  ...item,
  slug: slugify(item.name.replace(/\s+(?:في\s+)?نقادة$/, '')),
}));

export function getActivityBySlug(slug: string) {
  const normalized = normalizeRouteSlug(slug);
  return activityLandings.find((item) => item.slug === normalized);
}

export function getBusinessesForActivity(activity: ActivityLanding): Business[] {
  const subcategories = new Set(activity.subcategories || []);
  const categories = new Set(activity.categories || []);
  return businesses.filter((item) => categories.has(item.category) || Boolean(item.subcategory && subcategories.has(item.subcategory)));
}
