import { normalizeArabic } from '@/lib/site';

export function normalizeJobSearch(value: string) {
  return normalizeArabic(value).replace(/\b(?:cashier)\b/g, 'كاشير')
    .replace(/(^|\s)(?:ال)?كشير(?=\s|$)/g, '$1كاشير');
}

export function jobMatchesSearch(text: string, query: string) {
  const haystack = normalizeJobSearch(text);
  return normalizeJobSearch(query).split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

export function jobSearchIntent(value: string) {
  const query = normalizeJobSearch(value);
  const cashier = /(^|\s)(?:ال)?كاشير(?=\s|$)/.test(query);
  const seeker = /باحث(?:ون|ين)? عن (?:عمل|شغل|وظيفه)|خبرات لل?عمل/.test(query);
  if (!cashier && !seeker && !/(^|\s)(?:وظيفه|وظائف|توظيف)(?=\s|$)|فرص(?:ه)? (?:عمل|شغل)|بدور (?:علي|على) شغل/.test(query)) return null;
  return {
    kind: 'page' as const,
    title: seeker ? 'باحثون عن عمل وخبرات من أهل البلد' : cashier ? 'ابحث عن وظائف كاشير' : 'فرص العمل في نقادة وقنا والأقصر',
    subtitle: seeker ? 'شوف الخبرات المنشورة وتواصل مع أصحابها' : 'افتح قسم الوظائف وشوف الإعلانات المنشورة المطابقة؛ توافر وظيفة بعينها يتغير مع التحديث',
    href: `/jobs?view=${seeker ? 'seeker' : 'all'}${cashier && !seeker ? '&q=' + encodeURIComponent('كاشير') : ''}#opportunities`,
    badge: seeker ? 'باحثون عن عمل' : 'بحث وظائف',
  };
}
