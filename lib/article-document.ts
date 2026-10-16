import type { EditorialPost } from './editorial-posts';
import type { RoleModel } from './role-models';

export type ArticleKind = 'article' | 'role_model';
export type ArticleSharing = { title: string; description: string; image?: { src: string; alt: string; width: number; height: number } };
export type ArticleDocument =
  | { format: 'editorial'; content: EditorialPost; sharing: ArticleSharing }
  | { format: 'role_model'; content: RoleModel; sharing: ArticleSharing };

export type Field = { key: string; label: string; type: 'text' | 'long' | 'lines' | 'number' | 'date' | 'url' | 'imagePath' | 'object' | 'list'; fields?: Field[]; optional?: boolean; max?: number; image?: boolean };
const text = (key: string, label: string, type: Field['type'] = 'text', optional = false): Field => ({ key, label, type, optional });
const list = (key: string, label: string, fields: Field[]): Field => ({ key, label, type: 'list', fields });
const sourceFields = [text('label', 'اسم المصدر'), text('url', 'رابط المصدر', 'url')];
export const editorialImageFields: Field[] = [text('asset', 'الصورة', 'imagePath'), text('alt', 'وصف الصورة لمحركات البحث'), text('caption', 'التعليق أسفل الصورة', 'long'), text('width', 'العرض', 'number'), text('height', 'الارتفاع', 'number'), text('originalAsset', 'الصورة الأصلية (اختياري)', 'imagePath', true)];
export const rolePhotoFields: Field[] = [text('src', 'الصورة', 'imagePath'), text('alt', 'وصف الصورة لمحركات البحث'), text('caption', 'التعليق أسفل الصورة', 'long'), text('width', 'العرض', 'number'), text('height', 'الارتفاع', 'number'), text('cardPosition', 'موضع الصورة في البطاقة (مثل 50% 30%)', 'text', true), text('heroPosition', 'موضع الصورة في الغلاف (مثل 50% 30%)', 'text', true)];
export const sharingFields: Field[] = [text('title', 'عنوان المشاركة'), text('description', 'وصف المشاركة', 'long'), { key: 'image', label: 'صورة واتساب والسوشيال ميديا', type: 'object', image: true, optional: true, fields: rolePhotoFields.filter(f => ['src', 'alt', 'width', 'height'].includes(f.key)) }];
export const editorialFields: Field[] = [
  text('title', 'عنوان المقال'), text('locality', 'القرية أو المنطقة'), text('category', 'التصنيف'), text('excerpt', 'المقدمة المختصرة أعلى الصفحة', 'long'),
  text('seoTitle', 'عنوان نتائج البحث'), text('description', 'وصف نتائج البحث', 'long'), text('keywords', 'الكلمات المفتاحية — كلمة في كل سطر', 'lines'),
  { key: 'hero', label: 'غلاف المقال', type: 'object', fields: editorialImageFields, image: true },
  text('intro', 'مقدمة المقال — فقرة في كل سطر فارغ', 'lines'),
  list('sections', 'أقسام المقال', [text('heading', 'عنوان القسم'), text('paragraphs', 'فقرات القسم', 'lines'), { key: 'image', label: 'صورة القسم', type: 'object', image: true, optional: true, fields: editorialImageFields }, list('timeline', 'التسلسل الزمني', [text('period', 'الفترة'), text('name', 'العنوان'), text('description', 'التفاصيل', 'long')]), list('sources', 'مصادر القسم', sourceFields)]),
  list('faqs', 'الأسئلة الشائعة', [text('question', 'السؤال'), text('answer', 'الإجابة', 'long')]), list('sources', 'المصادر والمراجع', sourceFields),
  text('relatedVillage', 'القرية المرتبطة بالمقال'), text('publishedAt', 'تاريخ النشر', 'date'), text('imageNotice', 'ملاحظة الصور', 'long', true),
  text('authorName', 'اسم الكاتب', 'text', true), text('authorUrl', 'رابط الكاتب', 'url', true), text('authorRole', 'صفة الكاتب', 'text', true), text('authorBio', 'نبذة الكاتب', 'long', true),
];
export const roleModelFields: Field[] = [
  text('seoTitle', 'عنوان نتائج البحث', 'text', true), text('keywords', 'كلمات مفتاحية', 'lines', true), text('name', 'اسم صاحب الحكاية'), text('articleTitle', 'عنوان المقال', 'text', true), text('alternateNames', 'أسماء بديلة للبحث', 'lines', true),
  text('locality', 'القرية أو المنطقة'), text('shortTitle', 'التعريف أسفل العنوان', 'long'), text('description', 'وصف نتائج البحث', 'long'),
  text('heroTags', 'وسوم الغلاف', 'lines'), text('introduction', 'مقدمة الحكاية', 'lines'),
  list('sections', 'أقسام الحكاية', [text('heading', 'عنوان القسم'), text('paragraphs', 'فقرات القسم', 'lines')]),
  text('highlights', 'أبرز محاور الحكاية', 'lines'), text('interestsLabel', 'عنوان الاهتمامات', 'text', true), text('interests', 'الاهتمامات', 'lines'),
  { ...list('photos', 'صور الحكاية — الصورة الأولى غلاف الصفحة', rolePhotoFields), image: true },
  text('cardPhotoIndex', 'رقم صورة بطاقة العرض (يبدأ من صفر)', 'number', true), text('socialPhotoIndex', 'رقم صورة المشاركة الافتراضية (يبدأ من صفر)', 'number', true),
  { key: 'socialImage', label: 'صورة المشاركة الحالية', type: 'object', fields: sharingFields[2].fields, optional: true, image: true },
  text('sourceLabel', 'اسم المصدر الأساسي'), text('sourceUrl', 'رابط المصدر الأساسي', 'url'), list('additionalSources', 'مصادر إضافية', sourceFields),
  text('sourceDisclosure', 'ملاحظة المصدر والتصحيحات', 'long'), text('rewrittenBy', 'تمت إعادة الصياغة بواسطة', 'text', true),
  text('publishedAt', 'تاريخ النشر', 'date'), text('diedAt', 'تاريخ الوفاة (اختياري)', 'date', true),
];

export function articleKind(document: ArticleDocument): ArticleKind { return document.format === 'editorial' ? 'article' : 'role_model'; }
export function articleTitle(document: ArticleDocument) { return document.format === 'editorial' ? document.content.title : document.content.articleTitle || document.content.name; }
export function articleSummary(document: ArticleDocument) { return document.content.description; }
export function articlePath(kind: ArticleKind, slug: string) { return `/${kind === 'article' ? 'blog' : 'role-models'}/${encodeURIComponent(slug)}/`; }
export function safeImagePath(value: string) {
  return !value || (/^\/images\/[\w./-]+$/.test(value) && !value.includes('..'))
    || /^\/api\/article-media\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(value)
    || /^[\w.-]+\.(?:jpg|jpeg|png|webp|avif)$/i.test(value);
}
export function blankFields(fields: Field[]): Record<string, unknown> {
  return Object.fromEntries(fields.filter(f => !f.optional).map(f => [f.key, f.type === 'object' ? blankFields(f.fields || []) : f.type === 'list' || f.type === 'lines' ? [] : f.type === 'number' ? 1200 : '']));
}
function cleanFields(value: unknown, fields: Field[], published: boolean): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('بيانات المقال غير صالحة.');
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = source[field.key];
    if (raw === undefined || raw === null || (raw === '' && field.optional)) {
      if (field.optional) continue;
      if (field.type === 'list' || field.type === 'lines') { result[field.key] = []; continue; }
      throw Error(`راجعي حقل «${field.label}».`);
    }
    if (field.type === 'object') result[field.key] = cleanFields(raw, field.fields || [], published);
    else if (field.type === 'list') {
      if (!Array.isArray(raw) || raw.length > 60) throw Error(`عدد العناصر في «${field.label}» غير صالح.`);
      result[field.key] = raw.map(row => cleanFields(row, field.fields || [], published));
    } else if (field.type === 'lines') {
      if (!Array.isArray(raw) || raw.length > 100 || raw.some(v => typeof v !== 'string' || v.length > 15000)) throw Error(`راجعي «${field.label}».`);
      result[field.key] = raw.map(v => v.trim()).filter(Boolean);
    } else if (field.type === 'number') {
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < (['width', 'height'].includes(field.key) ? 1 : 0) || raw > 8000) throw Error(`راجعي «${field.label}».`);
      result[field.key] = raw;
    } else {
      if (typeof raw !== 'string' || raw.length > (field.type === 'long' ? 15000 : 1000)) throw Error(`راجعي «${field.label}».`);
      const s = raw.trim();
      const localUrl = /^\/(?!\/)[^\s\\]*$/.test(s);
      if (field.type === 'url' && s && !localUrl && (!/^https:\/\//i.test(s) || !URL.canParse(s) || new URL(s).username || new URL(s).password)) throw Error(`رابط «${field.label}» لازم يبدأ بـ https:// أو يكون رابطًا داخل الموقع.`);
      if (field.type === 'imagePath' && (!safeImagePath(s) || (published && !s))) throw Error('اختاري صورة مرفوعة أو صورة من صور الموقع.');
      if (field.type === 'date' && s && (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0, 10) !== s)) throw Error(`راجعي «${field.label}».`);
      if (['heroPosition', 'cardPosition'].includes(field.key) && s && !/^(?:center|left|right|(?:100|\d{1,2})%) (?:center|top|bottom|(?:100|\d{1,2})%)$/.test(s)) throw Error('موضع الصورة يكون نسبتين مئويتين، مثل 50% 30%.');
      result[field.key] = s;
    }
  }
  return result;
}

export function validateArticleDocument(value: unknown, kind: ArticleKind, slug: string, published = false): ArticleDocument {
  if (!value || typeof value !== 'object' || JSON.stringify(value).length > 240000) throw Error('حجم المقال أكبر من الحد المسموح.');
  const doc = value as ArticleDocument;
  if (doc.format !== (kind === 'article' ? 'editorial' : 'role_model')) throw Error('نوع المقال غير صحيح.');
  const content = cleanFields(doc.content, kind === 'article' ? editorialFields : roleModelFields, published);
  content.slug = slug;
  content.modifiedAt = new Date().toISOString().slice(0, 10);
  const sharing = cleanFields(doc.sharing || { title: '', description: '' }, sharingFields, published);
  const result = { format: doc.format, content, sharing } as ArticleDocument;
  if (published && (articleTitle(result).length < 3 || articleSummary(result).length < 15)) throw Error('أضيفي عنوانًا ووصفًا واضحين قبل النشر.');
  if (published && !content.publishedAt) throw Error('حددي تاريخ النشر.');
  if (published && kind === 'article' && (!(content.intro as string[]).length && !(content.sections as unknown[]).length)) throw Error('المقال يحتاج نصًا قبل النشر.');
  if (kind === 'role_model') {
    const person = result.content as RoleModel;
    for (const index of [person.cardPhotoIndex, person.socialPhotoIndex]) if (index !== undefined && (index < 0 || index >= person.photos.length)) throw Error('رقم الصورة خارج صور الحكاية.');
  }
  if (new TextEncoder().encode(JSON.stringify(result)).length > 300000) throw Error('حجم المقال أكبر من الحد المسموح.');
  return result;
}

export function readArticleDocument(payload: Record<string, string>): ArticleDocument | null {
  if (!payload.document) return null;
  try {
    const doc = JSON.parse(payload.document) as ArticleDocument;
    if (!['editorial', 'role_model'].includes(doc.format) || !doc.content || !doc.sharing) return null;
    const cleaned = validateArticleDocument(doc, doc.format === 'editorial' ? 'article' : 'role_model', doc.content.slug);
    cleaned.content.modifiedAt = doc.content.modifiedAt;
    return cleaned;
  } catch { return null; }
}
