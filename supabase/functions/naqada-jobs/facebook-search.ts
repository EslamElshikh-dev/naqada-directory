import { findLocalPlace } from './places.ts';

function clean(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity] || entity)
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw) => {
      const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function field(xml: string, name: string) {
  return clean(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(xml)?.[1] || '');
}

function norm(value: string) {
  return value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064b-\u065f\u0670]/g, '');
}

function omitContacts(value: string) {
  return value.replace(/(?:\+?20|0020)?\s*01[0125](?:[\s-]?\d){8}/g, 'رقم التواصل في المنشور')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, 'البريد في المنشور');
}

function postUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname) || url.username || url.password) return null;
    const path = url.pathname;
    const isPost = /^\/groups\/[^/]+\/(?:posts|permalink)\/\d+\/?$/i.test(path)
      || /^\/[^/]+\/posts\/(?:pfbid[a-z0-9]+|\d+)\/?$/i.test(path)
      || (path === '/permalink.php' && !!url.searchParams.get('story_fbid') && !!url.searchParams.get('id'));
    if (!isPost) return null;
    const canonical = new URL(`https://www.facebook.com${path}`);
    if (path === '/permalink.php') {
      canonical.searchParams.set('story_fbid', url.searchParams.get('story_fbid')!);
      canonical.searchParams.set('id', url.searchParams.get('id')!);
    }
    return canonical.href;
  } catch { return null; }
}

// Search engines can surface only indexed, public posts. Keep a direct post URL
// and recent feed date; never turn a group homepage or an undated result into a job.
export function readFacebookSearch(xml: string, now = Date.now()) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 45).flatMap((match) => {
    const item = match[1];
    const url = postUrl(field(item, 'link'));
    const date = new Date(field(item, 'pubDate'));
    const age = now - date.getTime();
    if (!url || !Number.isFinite(age) || age < -86_400_000 || age > 14 * 86_400_000) return [];
    const sourceTitle = field(item, 'title').slice(0, 140);
    const sourceDescription = field(item, 'description').slice(0, 1000);
    const combined = norm(`${sourceTitle} ${sourceDescription}`);
    if (!/(وظيف|توظيف|مطلوب|تعيين|فرص عمل|فرصه عمل|شاغر|انضم)/.test(combined)
      || /(ابحث عن (عمل|وظيفه)|بدور على شغل|دوره تدريبيه|وظائف بكل المحافظات|نتائج التقديم)/.test(combined)) return [];
    const locality = findLocalPlace(sourceTitle, sourceDescription);
    if (!locality || (locality !== 'نقادة' && !/(نقاده|قنا)/.test(combined) && !/(بشلاو|قمولا|دنفيق)/.test(norm(locality)))) return [];
    const title = omitContacts(sourceTitle) || 'فرصة عمل في نقادة';
    const description = omitContacts(sourceDescription).slice(0, 240);
    const sourceName = url.includes('/groups/') ? 'منشور عام في جروب فيسبوك' : 'منشور عام في صفحة فيسبوك';
    return [{ kind: 'offer', origin: 'external', status: 'published', title,
      organization: sourceName, locality: locality === 'نقادة' ? 'مدينة نقادة' : locality,
      field: 'وظائف محلية', description: description.length >= 20 ? description : `فرصة عمل منشورة على فيسبوك. افتح المنشور الأصلي للتأكد من المكان والشروط واستمرار التقديم.`,
      contact_kind: 'link', contact_value: url, contact_consent: false, source_name: sourceName, source_url: url,
      source_published_at: date.toISOString(), published_at: date.toISOString(), expires_at: new Date(date.getTime() + 14 * 86_400_000).toISOString() }];
  });
}
