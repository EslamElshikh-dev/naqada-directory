export type DeveloperProjectCategory = 'local' | 'business' | 'product';
export type DeveloperProjectFilter = 'all' | DeveloperProjectCategory;
export type DeveloperProjectTheme = 'usayrat' | 'naqada' | 'tawod' | 'sama' | 'bowdy';

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
  { id: 'local', label: 'من البلد' },
  { id: 'business', label: 'شركات' },
  { id: 'product', label: 'تجارب' },
];

export const developerProjects: readonly DeveloperProject[] = [
  {
    title: 'دليل وموسوعة العسيرات',
    code: 'LOCAL / SOHAG',
    href: 'https://usayrat.online/',
    external: true,
    description: 'مشروع قريب من القلب: دليل محلي ينظّم خدمات مركز العسيرات وقراه ونجوعه، ويقرّب الناس من المكان والمعلومة. منه تفهم روح الفكرة وراء دليل نقادة.',
    image: '/images/developer-projects/usayrat.webp',
    imageAlt: 'لقطة فعلية من واجهة دليل العسيرات المحلي في سوهاج',
    theme: 'usayrat',
    brand: 'العسيرات · سوهاج',
    headline: ['من البلد،', 'ولأهلها.'],
    action: 'افتح الدليل ↗',
    category: 'local',
    highlights: ['دليل محلي', 'قرى ونجوع', 'بحث'],
  },
  {
    title: 'دليل نقادة',
    code: 'LOCAL / QENA',
    href: '/',
    external: false,
    description: 'التجربة اللي أنت فيها: مكان واحد لخدمات نقادة وقراها وأخبارها وحكايات أهلها، بخطوات واضحة ومحتوى يتراجع ويتحدّث.',
    image: '/images/landmarks/naqada-city.webp',
    imageAlt: 'مشهد من مدينة نقادة ضمن مشروع دليل نقادة',
    theme: 'naqada',
    brand: 'نقادة · قنا',
    headline: ['المعلومة قريبة،', 'يا ابن البلد.'],
    action: 'استكشف الدليل ←',
    category: 'local',
    highlights: ['خدمات', 'حكايات', 'مجتمع'],
  },
  {
    title: 'شركة تعاود للمقاولات',
    code: 'BUSINESS / RIYADH',
    href: 'https://tawodco.com/',
    external: true,
    description: 'حضور رقمي لشركة مقاولات يعرّف بخدماتها، وينظّم رحلة الزائر من أول سؤال إلى وسيلة التواصل المناسبة.',
    image: '/images/developer-projects/tawod.webp',
    imageAlt: 'لقطة فعلية من موقع شركة تعاود للمقاولات',
    theme: 'tawod',
    brand: 'TAWOD',
    headline: ['شغل على الأرض،', 'وحضور على الويب.'],
    action: 'زيارة المشروع ↗',
    category: 'business',
    highlights: ['مقاولات', 'محتوى', 'تجربة'],
  },
  {
    title: 'مركز سما سكان للأشعة',
    code: 'HEALTH / RIYADH',
    href: 'https://samascan.vercel.app/',
    external: true,
    description: 'تجربة رقمية لمركز أشعة في الرياض تقدّم خدماته الطبية بهدوء ووضوح، وتسهل الوصول إلى معلومات الفحص والتواصل.',
    image: '/images/developer-projects/sama-scan.webp',
    imageAlt: 'لقطة فعلية من موقع مركز سما سكان للأشعة',
    theme: 'sama',
    brand: 'SAMA SCAN',
    headline: ['الوضوح', 'جزء من العناية.'],
    action: 'زيارة المشروع ↗',
    category: 'product',
    highlights: ['صحة', 'سهولة وصول', 'خدمات'],
  },
  {
    title: 'Bowdy Labs',
    code: 'TECH / AI',
    href: 'https://bowdylabs.com/',
    external: true,
    description: 'موقع لشركة تقنية وذكاء اصطناعي، يترجم فكرتها إلى هوية واضحة وتجربة متجاوبة تصل لجمهورها العربي.',
    image: '/images/developer-projects/bowdy-labs.webp',
    imageAlt: 'لقطة فعلية من موقع شركة Bowdy Labs',
    theme: 'bowdy',
    brand: 'BOWDY LABS',
    headline: ['فكرة بكرة،', 'قدّامك النهارده.'],
    action: 'زيارة المشروع ↗',
    category: 'product',
    highlights: ['ذكاء اصطناعي', 'هوية', 'منتج'],
  },
];
