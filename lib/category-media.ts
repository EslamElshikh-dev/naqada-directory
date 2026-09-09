export type CategoryMedia = {
  imageUrl: string;
  imageAlt: string;
};

const media: Record<string, CategoryMedia> = {
  health: { imageUrl: '/images/categories/health.webp', imageAlt: 'مشهد توضيحي لخدمات الطب والصحة في بيئة محلية بصعيد مصر' },
  retail: { imageUrl: '/images/categories/retail.webp', imageAlt: 'مشهد توضيحي لمتجر محلي واحتياجات التسوق اليومية في نقادة' },
  education: { imageUrl: '/images/categories/education.webp', imageAlt: 'مشهد توضيحي للتعليم داخل فصل دراسي في صعيد مصر' },
  food: { imageUrl: '/images/categories/food.webp', imageAlt: 'مشهد توضيحي للأطعمة والمطاعم الشعبية المصرية' },
  worship: { imageUrl: '/images/categories/worship.webp', imageAlt: 'مشهد توضيحي لمسجد محلي وبيئة دور العبادة في نقادة' },
  build: { imageUrl: '/images/categories/build.webp', imageAlt: 'مشهد توضيحي لأعمال البناء والصيانة المنزلية في نقادة' },
  transport: { imageUrl: '/images/categories/transport.webp', imageAlt: 'مشهد توضيحي لخدمات السيارات والموتوسيكلات في نقادة' },
  tech: { imageUrl: '/images/categories/tech.webp', imageAlt: 'مشهد توضيحي لمحل هواتف وإلكترونيات وصيانة أجهزة' },
  professional: { imageUrl: '/images/categories/professional.webp', imageAlt: 'مشهد توضيحي لخدمات المهندسين والمحاسبين والمكاتب المهنية' },
  community: { imageUrl: '/images/categories/community.webp', imageAlt: 'مشهد توضيحي لمبادرة أهلية وعمل مجتمعي محلي' },
  government: { imageUrl: '/images/categories/government.webp', imageAlt: 'مشهد توضيحي لمكتب خدمات عامة واستقبال المواطنين' },
  finance: { imageUrl: '/images/categories/finance.webp', imageAlt: 'مشهد توضيحي للخدمات البنكية والمالية في نقادة' },
  sports: { imageUrl: '/images/categories/sports.webp', imageAlt: 'مشهد توضيحي للرياضة ومراكز الشباب في نقادة' },
  events: { imageUrl: '/images/categories/events.webp', imageAlt: 'مشهد توضيحي لقاعة أفراح وتجهيز مناسبة محلية' },
  beauty: { imageUrl: '/images/categories/beauty.webp', imageAlt: 'مشهد توضيحي لخدمات الحلاقة والتجميل والعناية الشخصية' },
  heritage: { imageUrl: '/images/categories/heritage.webp', imageAlt: 'مشهد توضيحي مستلهم من فخار نقادة وتراثها الأثري' },
  agriculture: { imageUrl: '/images/categories/agriculture.webp', imageAlt: 'مشهد توضيحي للزراعة والإنتاج الغذائي في ريف نقادة' },
  furniture: { imageUrl: '/images/categories/furniture.webp', imageAlt: 'مشهد توضيحي للنجارة والأثاث والديكور في نقادة' },
  childcare: { imageUrl: '/images/categories/childcare.webp', imageAlt: 'مشهد توضيحي للتعليم المبكر ورعاية الأطفال' },
  tourism: { imageUrl: '/images/categories/tourism.webp', imageAlt: 'مشهد توضيحي للزيارات والانتقالات بجوار نيل نقادة' },
};

const categoryMediaKeys: Record<string, keyof typeof media> = {
  'الطب والصحة': 'health',
  'التجزئة والتسوق': 'retail',
  'التعليم': 'education',
  'المطاعم والأطعمة': 'food',
  'دور العبادة': 'worship',
  'البناء والصيانة': 'build',
  'السيارات والنقل': 'transport',
  'الإلكترونيات والهواتف': 'tech',
  'الخدمات المهنية': 'professional',
  'الجمعيات والمجتمع': 'community',
  'الخدمات الحكومية': 'government',
  'الخدمات المالية': 'finance',
  'الرياضة والمجتمع': 'sports',
  'المناسبات': 'events',
  'التجميل والعناية': 'beauty',
  'المعالم والتراث': 'heritage',
  'الزراعة والأغذية': 'agriculture',
  'الأثاث والديكور': 'furniture',
  'الرياضة': 'sports',
  'التعليم والرعاية': 'childcare',
  'السياحة والنقل': 'tourism',
  'المعالم والترفيه': 'heritage',
};

export function getCategoryMedia(category: string) {
  return media[categoryMediaKeys[category] || 'professional'];
}
