import type { EditorialImage, EditorialPost } from './editorial-posts';

const image = (asset: string, alt: string, caption: string): EditorialImage => ({
  asset,
  alt,
  caption,
  width: 1920,
  height: 1080,
});

type Enrichment = {
  sectionIndex: number;
  image: EditorialImage;
};

const enrichments: Record<string, Enrichment> = {
  'asmant-sheikh-ali-mawlid-marmah': {
    sectionIndex: 2,
    image: image(
      'asmant-community-gathering.jpg',
      'مشهد توضيحي ثانٍ مستوحى من أسمنت بنقادة يجمع أجواء تجمع ريفي ومسجدًا وحقولًا وخيولًا مرتبطة بمشهد المولد والمرماح',
      'صورة توضيحية إضافية تستلهم أجواء أسمنت الاجتماعية والدينية وقت المناسبات، ولا توثق موقعًا أو فعالية حقيقية بعينها.'
    ),
  },
  'sahil-bashlaw-hawawra-diwans-old-mosque': {
    sectionIndex: 1,
    image: image(
      'sahil-bashlaw-lane-secondary.jpg',
      'مشهد توضيحي ثانٍ لممر ريفي في نطاق ساحل بشلاو مع بيوت ونخيل وحقول وإيحاء بديوان ومسجد محلي',
      'صورة توضيحية إضافية للبيئة العامة في ساحل بشلاو والهواورة؛ لا تمثل ديوان آل غانم أو مسجدًا بعينه.'
    ),
  },
  'daraw-naqada-school-mosque-community': {
    sectionIndex: 2,
    image: image(
      'awsat-qamula-network.jpg',
      'مشهد توضيحي واسع لشبكة الطرق والحقول والقرى في نطاق الأوسط قمولا المحيط بدراو بنقادة',
      'صورة سياقية إضافية تشرح ارتباط دراو بشبكة الأوسط قمولا والطرق الريفية والخدمات، وليست خريطة دقيقة.'
    ),
  },
  'sahil-daraw-sheikh-fakhry-quran-education': {
    sectionIndex: 2,
    image: image(
      'daraw-community.jpg',
      'مشهد توضيحي ريفي من سياق دراو وساحل دراو يجمع مدرسة ومسجدًا وحقولًا ونخيلًا في مركز نقادة',
      'صورة سياقية إضافية تربط ساحل دراو ببيئته التعليمية والدينية الأوسع حول دراو، ولا تمثل مبنى حقيقيًا محددًا.'
    ),
  },
  'naj-al-qarya-mosques-quran-school': {
    sectionIndex: 2,
    image: image(
      'awsat-qamula-network.jpg',
      'مشهد توضيحي لشبكة القرى والطرق الزراعية في الأوسط قمولا حيث يقع نجع القرية بمركز نقادة',
      'صورة سياقية إضافية توضح البيئة الأوسع المحيطة بنجع القرية داخل الأوسط قمولا، وليست خريطة أو صورة توثيقية للمكان.'
    ),
  },
  'naj-al-sadr-yousifat-fawra-identity': {
    sectionIndex: 2,
    image: image(
      'awsat-qamula-network.jpg',
      'مشهد توضيحي واسع لحقول وطرق وقرى الأوسط قمولا المرتبطة بالسياق الجغرافي لنجع الصدر في نقادة',
      'صورة سياقية إضافية للبيئة الزراعية والجغرافية الأوسع لنجع الصدر؛ لا تمثل حدودًا إدارية دقيقة.'
    ),
  },
  'awsat-qamula-villages-network-daily-life': {
    sectionIndex: 2,
    image: image(
      'daraw-community.jpg',
      'مشهد توضيحي من إحدى البيئات الريفية داخل شبكة الأوسط قمولا يجمع مدرسة ومسجدًا وحركة يومية بين البيوت والحقول',
      'صورة إضافية تجسد فكرة المؤسسات والحركة اليومية داخل شبكة قرى الأوسط قمولا، ولا توثق قرية أو مبنى بعينه.'
    ),
  },
  'hager-tukh-pottery-complex-future': {
    sectionIndex: 2,
    image: image(
      'naqada-pottery-heritage.jpg',
      'مشهد توضيحي لحرفي يشكل الفخار وأوانٍ مستوحاة بصريًا من تراث نقادة داخل ورشة دافئة الإضاءة',
      'صورة إضافية تربط مشروع حاجر طوخ بسياق حرفة الفخار الأوسع في نقادة؛ الأواني ليست قطعًا أثرية أصلية.'
    ),
  },
  'naqada-pottery-ancient-modern-heritage': {
    sectionIndex: 2,
    image: image(
      'hager-tukh-pottery.jpg',
      'مشهد توضيحي لورشة فخار معاصرة في بيئة مستوحاة من حاجر طوخ ونقادة مع طين وأفران وأوانٍ قيد التجفيف',
      'صورة إضافية توضح الجانب الحرفي المعاصر من قصة فخار نقادة، ولا تدعي توثيق ورشة حقيقية بعينها.'
    ),
  },
};

export function enrichEditorialPostImages(post: EditorialPost): EditorialPost {
  const enrichment = enrichments[post.slug];
  if (!enrichment) return post;

  return {
    ...post,
    sections: post.sections.map((section, index) => {
      if (index !== enrichment.sectionIndex || section.image) return section;
      return { ...section, image: enrichment.image };
    }),
  };
}
