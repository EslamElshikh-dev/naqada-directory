export type DeveloperProjectCategory = 'local' | 'business' | 'product' | 'identity';
export type DeveloperProjectFilter = 'all' | DeveloperProjectCategory;
export type DeveloperProjectTheme = 'naqada' | 'tawod' | 'sama' | 'bowdy' | 'portfolio' | 'ahmadi';

export type DeveloperProject = {
  title: string;
  code: string;
  href: string;
  external: boolean;
  description: string;
  image: string;
  imageAlt: string;
  theme: DeveloperProjectTheme;
  brand: string;
  headline: readonly [string, string];
  action: string;
  category: DeveloperProjectCategory;
  highlights: readonly string[];
};

export const developerProjectFilters: ReadonlyArray<{ id: DeveloperProjectFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'local', label: 'محلي' },
  { id: 'business', label: 'أعمال' },
  { id: 'product', label: 'منتجات' },
  { id: 'identity', label: 'هوية' },
];

export const developerProjects: readonly DeveloperProject[] = [
  {
    title: 'دليل نقادة',
    code: 'LOCAL / KNOWLEDGE',
    href: '/',
    external: false,
    description: 'منصة محلية تجمع الخدمات والقرى والأخبار والموسوعة في تجربة عربية واحدة سريعة وواضحة.',
    image: '/images/landmarks/naqada-city.webp',
    imageAlt: 'مشهد من مدينة نقادة ضمن واجهة دليل نقادة',
    theme: 'naqada',
    brand: 'نقادة',
    headline: ['المكان أقرب', 'مما تتخيّل.'],
    action: 'استكشف الدليل ←',
    category: 'local',
    highlights: ['دليل', 'موسوعة', 'أخبار'],
  },
  {
    title: 'Tawod',
    code: 'COMMERCE / EXPERIENCE',
    href: 'https://tawodco.com/',
    external: true,
    description: 'تجربة رقمية للعلامة التجارية تجمع الحضور البصري مع رحلة استخدام عملية ومنظمة.',
    image: '/images/developer-projects/tawod.webp',
    imageAlt: 'لقطة فعلية من واجهة موقع شركة تعاود للمقاولات',
    theme: 'tawod',
    brand: 'TAWOD',
    headline: ['شكلٌ يبيع', 'قبل الكلام.'],
    action: 'زيارة المشروع ↗',
    category: 'business',
    highlights: ['علامة', 'تحويل', 'تجربة'],
  },
  {
    title: 'Sama Scan',
    code: 'HEALTH / PRODUCT',
    href: 'https://samascan.vercel.app/',
    external: true,
    description: 'واجهة منتج طبي حديثة توازن بين الثقة، بساطة الوصول، وسرعة عرض المعلومات.',
    image: '/images/developer-projects/sama-scan.webp',
    imageAlt: 'لقطة فعلية من واجهة موقع مركز سما سكان للأشعة',
    theme: 'sama',
    brand: 'SAMA SCAN',
    headline: ['دقة طبية.', 'تجربة إنسانية.'],
    action: 'زيارة المشروع ↗',
    category: 'product',
    highlights: ['ثقة طبية', 'وضوح', 'حجز'],
  },
  {
    title: 'Bowdy Labs',
    code: 'LAB / DIGITAL',
    href: 'https://bowdylabs.com/',
    external: true,
    description: 'هوية رقمية مستقبلية لشركة تقنية وذكاء اصطناعي، تجمع الرسالة المباشرة مع تجربة متجاوبة قابلة للتوسع.',
    image: '/images/developer-projects/bowdy-labs.webp',
    imageAlt: 'لقطة فعلية من واجهة موقع Bowdy Labs',
    theme: 'bowdy',
    brand: 'BOWDY LABS',
    headline: ['ذكاءٌ عملي.', 'هويةٌ جريئة.'],
    action: 'زيارة المشروع ↗',
    category: 'product',
    highlights: ['ذكاء اصطناعي', 'هوية', 'منتج'],
  },
  {
    title: 'المهندس إسلام الشيخ',
    code: 'IDENTITY / PORTFOLIO',
    href: 'https://www.eslam-elshikh.com/',
    external: true,
    description: 'منصة شخصية ثنائية اللغة توثّق الخبرة في الأمن السيبراني والبرمجيات والذكاء الاصطناعي ومنظومة Google.',
    image: '/images/eslam-elshikh.jpg',
    imageAlt: 'المهندس إسلام الشيخ في واجهة موقعه الشخصي',
    theme: 'portfolio',
    brand: 'ESLAM ELSHIKH',
    headline: ['Secure.', 'Build. Grow.'],
    action: 'زيارة المشروع ↗',
    category: 'identity',
    highlights: ['هوية', 'خبرة', 'إثبات'],
  },
  {
    title: 'الأحمدي للمقاولات',
    code: 'CONTRACTING / SEO',
    href: 'https://alahmadi-contracting-riyadh.vercel.app/',
    external: true,
    description: 'منصة خدمات مقاولات متعددة الصفحات، ببنية بحث محلي ومحتوى متخصص وتجربة اتصال واضحة.',
    image: '/images/developer-projects/alahmadi.svg',
    imageAlt: 'بطاقة المعاينة الرسمية لموقع الأحمدي للمقاولات',
    theme: 'ahmadi',
    brand: 'AL AHMADI',
    headline: ['بناءٌ متقن.', 'ظهورٌ أقوى.'],
    action: 'زيارة المشروع ↗',
    category: 'business',
    highlights: ['خدمات', 'بحث محلي', 'محتوى'],
  },
];
