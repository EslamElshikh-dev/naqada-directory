export type RoleModelPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

export type RoleModel = {
  slug: string;
  name: string;
  locality: string;
  shortTitle: string;
  description: string;
  publishedAt: string;
  modifiedAt: string;
  sourceUrl: string;
  sourceLabel: string;
  introduction: string[];
  sections: { heading: string; paragraphs: string[] }[];
  highlights: string[];
  interests: string[];
  photos: RoleModelPhoto[];
};

/**
 * Each entry owns one public, indexable profile. Add only attributed material,
 * and attach locally hosted, permission-cleared photographs before using them.
 */
export const roleModels: RoleModel[] = [
  {
    slug: 'aya-refai-abdelshafi',
    name: 'آية رفاعي عبدالشافي',
    locality: 'الأوسط قمولا بشلاو · مركز نقادة',
    shortTitle: 'طالبة من نقادة تجمع بين الدراسة والتطوع والتكنولوجيا',
    description: 'تعرف على آية رفاعي عبدالشافي من الأوسط قمولا بشلاو بمركز نقادة، ومسيرتها الدراسية ومشاركاتها الطلابية والتطوعية كما وردت في منشور نماذج مشرفة في قنا.',
    publishedAt: '2026-09-24',
    modifiedAt: '2026-09-24',
    sourceUrl: 'https://www.facebook.com/permalink.php?story_fbid=pfbid02UkWHQ49cfB1fjAvinpcefoHnsqJe19816AiPAn3LxqinCd2HYPP7btqXTzYdKLMLl&id=61578580106698',
    sourceLabel: 'المنشور الأصلي على صفحة نماذج مشرفة في قنا',
    introduction: [
      'من الأوسط قمولا بشلاو، تواصل آية رفاعي عبدالشافي دراستها واهتمامها بالتكنولوجيا والعمل التطوعي. نقلت صفحة «نماذج مشرفة في قنا» قصتها بوصفها مثالًا لشابة من مركز نقادة تستثمر وقتها في التعلم والمشاركة.',
      'نعرض هنا أبرز ما ورد في المنشور بصياغة تحريرية مختصرة، مع رابط المصدر. الألقاب والتدريبات والمشاركات المذكورة منسوبة إلى المنشور، ولا تُعد مراجعة مستقلة لشهادات الجهات المعنية.',
    ],
    sections: [
      {
        heading: 'من نقادة إلى النشاط الجامعي',
        paragraphs: [
          'بحسب المنشور، تدرس آية في الفرقة الثالثة بكلية الآداب، قسم المكتبات وتكنولوجيا المعلومات. ويذكر أنها حصلت على لقب الطالبة المثالية على مستوى جامعة قنا.',
          'ويشير المنشور كذلك إلى مشاركتها في «سفراء النوايا الحسنة» بجامعة الفيوم وحصولها على لقب السفيرة على مستوى الجامعات. صورة التكريم المرفقة بالمنشور تُظهر مشاركة مرتبطة بملتقى طلابي في جامعة الفيوم، أما تفاصيل الألقاب الأخرى فننقلها كما وردت لدى الناشر.',
        ],
      },
      {
        heading: 'تعلم مستمر ومهارات متنوّعة',
        paragraphs: [
          'يتحدث المصدر عن حصولها على دورة TOT من مركز رواد التفوق، ودورة ICDL، واهتمامها بتكنولوجيا المعلومات والذكاء الاصطناعي والتصميم وإدارة حسابات التواصل الاجتماعي.',
          'وتشمل اهتماماتها، كما يورد المنشور، البرمجة والتعلم الإلكتروني والتواصل الفعّال وتطوير الذات. الحكاية أهنه مش لقب واحد؛ الحكاية في السعي للتعلّم خطوة ورا خطوة.',
        ],
      },
      {
        heading: 'مساحة للعمل التطوعي',
        paragraphs: [
          'يذكر المنشور مشاركتها متطوعة في صناع الحياة وجمعية «أنا مصري»، وعضويتها في رواد التطوير والتنمية بوزارة الشباب والرياضة. ترد أسماء الجهات هنا نقلًا عن المصدر الأصلي، ويمكن للجهات أو صاحبة القصة إرسال تصحيح إذا تغيّرت أي صفة أو مشاركة.',
        ],
      },
    ],
    highlights: ['الدراسة في المكتبات وتكنولوجيا المعلومات', 'نشاط طلابي في جامعتي قنا والفيوم بحسب المصدر', 'مشاركات تطوعية وتدريبات تقنية'],
    interests: ['تكنولوجيا المعلومات', 'الذكاء الاصطناعي', 'التصميم', 'التعلم الإلكتروني', 'العمل التطوعي'],
    photos: [],
  },
];

export function getRoleModel(slug: string) {
  return roleModels.find((person) => person.slug === slug);
}
