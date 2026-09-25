import { findJobPlace } from './places.ts';

function clean(value: string, limit: number) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<br\s*\/?\s*>/gi, ' · ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw) => {
      const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
    })[entity] || entity)
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

const norm = (value: string) => value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064b-\u065f\u0670]/g, '');

export function readPublicTelegram(html: string, name: string, channel: string, now = Date.now()) {
  return [...html.matchAll(/<div class="tgme_widget_message_wrap[^\"]*"[^>]*>([\s\S]*?)(?=<div class="tgme_widget_message_wrap|$)/gi)].slice(-45).flatMap((match) => {
    const block = match[1];
    const post = /data-post="([\w]+\/\d+)"/.exec(block)?.[1];
    const publishedAt = new Date(/<time[^>]+datetime="([^"]+)"/.exec(block)?.[1] || '');
    const age = now - publishedAt.getTime();
    const content = /<div class="tgme_widget_message_text[^\"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1] || '';
    // Public channels append self-promotion and links to every post. Their
    // channel name often includes Luxor even when the job is in another city.
    const message = clean(content, 1700)
      .split(/🔥 تابع فرص عمل الصعيد|______|لينك جروب الفيسبوك|لينك قناة الواتساب/i)[0]
      .replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);
    const normalized = norm(message);
    const place = findJobPlace(message.slice(0, 180), message.slice(180));
    if (!post?.startsWith(`${channel}/`) || !place || !/(وظيف|توظيف|مطلوب|تعيين|فرص عمل|شاغر)/.test(normalized)
      || /(بدور على شغل|ابحث عن وظيفه|نتائج التقديم)/.test(normalized)
      || !Number.isFinite(age) || age < -86_400_000 || age > 14 * 86_400_000) return [];
    const headline = message.split(/[.!؟·\n]/).map((part) => part.trim()).find((part) => /(مطلوب|وظيف|فرص عمل|تعيين)/.test(norm(part))) || `فرصة عمل في ${place.locality}`;
    const sourceUrl = `https://t.me/${post}`;
    return [{ kind: 'offer', origin: 'external', status: 'published', title: headline.slice(0, 140), organization: name,
      locality: place.locality, governorate: place.governorate, field: 'وظائف محلية',
      description: message, contact_kind: 'link', contact_value: sourceUrl, contact_consent: false,
      source_name: name, source_url: sourceUrl, source_published_at: publishedAt.toISOString(),
      published_at: publishedAt.toISOString(), expires_at: new Date(publishedAt.getTime() + 14 * 86_400_000).toISOString() }];
  });
}
