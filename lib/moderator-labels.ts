const actionLabels: Record<string, string> = {
  member_suspend: 'تقييد عضو', member_restore: 'إعادة تنشيط عضو', member_remove: 'إزالة عضو',
  submission_published: 'نشر نشاط أو تقييم', submission_approved: 'اعتماد مساهمة',
  submission_rejected: 'رفض مساهمة', submission_hidden: 'إخفاء تقييم',
  submission_reviewing: 'بدء مراجعة', submission_needs_info: 'طلب استكمال بيانات',
  content_published: 'نشر محتوى', content_hidden: 'إخفاء محتوى', content_draft: 'حفظ مسودة',
};
const kindLabels: Record<string, string> = { business: 'نشاط', contribution: 'مساهمة', review: 'تقييم', member: 'عضو', news: 'خبر', article: 'مقال' };

export function moderatorActionLabel(action: string) { return actionLabels[action] || action.replaceAll('_', ' '); }
export function moderatorKindLabel(kind: string) { return kindLabels[kind] || kind; }
