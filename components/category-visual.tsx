const categoryMarks: Record<string, string> = {
  'الطب والصحة': 'صحة',
  'التجزئة والتسوق': 'تسوق',
  'التعليم': 'علم',
  'المطاعم والأطعمة': 'طعام',
  'دور العبادة': 'دور',
  'البناء والصيانة': 'بناء',
  'السيارات والنقل': 'نقل',
  'الإلكترونيات والهواتف': 'تقنية',
  'الخدمات المهنية': 'مهن',
  'الخدمات الحكومية': 'عام',
  'الجمعيات والمجتمع': 'مجتمع',
  emergency: 'SOS',
};

export function CategoryVisual({ category, size = 'md' }: { category: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`category-visual category-visual--${size}`} aria-hidden="true"><i /><b>{categoryMarks[category] || category.slice(0, 4)}</b></span>;
}
