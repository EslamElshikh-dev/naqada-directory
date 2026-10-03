import { findJobPlace } from './places.ts';

function clean(value: string, limit: number) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw: string) => {
    const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
  })[entity] || entity).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

const field = (xml: string, tag: string, limit: number) =>
  clean(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml)?.[1] || '', limit);

export function readFeed(xml: string, feedName: string, now = Date.now()) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 45).flatMap((match) => {
    const item = match[1];
    const title = field(item, 'title', 140);
    const snippet = field(item, 'description', 420);
    let url: string;
    try {
      const link = new URL(field(item, 'link', 2000));
      if (link.protocol !== 'https:' || link.username || link.password) return [];
      url = link.href;
    } catch { return []; }
    const publishedAt = new Date(field(item, 'pubDate', 80));
    const age = now - publishedAt.getTime();
    if (title.length < 3 || !Number.isFinite(age) || age < -4 * 3_600_000 || age > 14 * 86_400_000) return [];
    const combined = `${title} ${snippet}`.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064b-\u065f\u0670]/g, '');
    if (!/(وظيف|توظيف|مطلوب|تعيين|فرص عمل|فرصه عمل|شاغر|انضم|\b(?:hiring|vacanc(?:y|ies)|recruiting|job opening)\b)/.test(combined)) return [];
    if (/(دوره تدريبيه|منحه دراسيه|وظائف بكل المحافظات|نتائج التقديم|نتيجه مسابقه)/.test(combined)) return [];
    const place = findJobPlace(title, snippet);
    if (!place) return [];
    const source = field(item, 'source', 120) || feedName;
    const details = snippet.replace(/(?:\+?20|0020)?\s*01[0125](?:[\s-]?\d){8}/g, 'رقم التواصل في الإعلان الأصلي')
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, 'البريد في الإعلان الأصلي');
    const description = details.length >= 20 ? details : `فرصة عمل منشورة من ${source}. افتح المصدر للتأكد من الشروط وطريقة التقديم واستمرار الإعلان.`;
    return [{ kind: 'offer', origin: 'external', status: 'published', title,
      organization: source, locality: place.locality, governorate: place.governorate, field: 'وظائف محلية', description,
      contact_kind: 'link', contact_value: url, contact_consent: false,
      source_name: source, source_url: url, source_published_at: publishedAt.toISOString(),
      published_at: publishedAt.toISOString(), expires_at: new Date(publishedAt.getTime() + 14 * 86_400_000).toISOString() }];
  });
}
