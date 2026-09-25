const FEED_URL = 'https://www.egyptyjobs.com/feeds/posts/default?alt=rss&q=%D9%82%D9%86%D8%A7&max-results=8';
const FRESH_MS = 14 * 86_400_000;
const MONTHS: Record<string, number> = { يناير: 0, فبراير: 1, مارس: 2, أبريل: 3, ابريل: 3, مايو: 4, يونيو: 5, يوليو: 6, أغسطس: 7, اغسطس: 7, سبتمبر: 8, أكتوبر: 9, اكتوبر: 9, نوفمبر: 10, ديسمبر: 11 };

function decode(value: string) {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw: string) => {
    const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi, (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity.toLowerCase()] || entity);
}

function clean(value: string, limit = 1200) {
  return decode(decode(value)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function field(item: string, name: string) {
  return new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i').exec(item)?.[1] || '';
}

function deadline(text: string) {
  // News posts sometimes remain in an RSS feed after their application window closes.
  const match = /(?:حتى|آخر موعد(?: للتقديم)?|نهاية التقديم)[^\d]{0,55}(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)\s+(20\d{2})/i.exec(text);
  if (!match) {
    const numeric = /(?:حتى|آخر موعد(?: للتقديم)?|نهاية التقديم)[^\d]{0,55}(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/.exec(text);
    if (!numeric) return null;
    const timestamp = Date.UTC(Number(numeric[1]), Number(numeric[2]) - 1, Number(numeric[3]), 23, 59, 59);
    const date = new Date(timestamp);
    return date.getUTCFullYear() === Number(numeric[1]) && date.getUTCMonth() === Number(numeric[2]) - 1 && date.getUTCDate() === Number(numeric[3]) ? timestamp : null;
  }
  const timestamp = Date.UTC(Number(match[3]), MONTHS[match[2]], Number(match[1]), 23, 59, 59);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === MONTHS[match[2]] && date.getUTCDate() === Number(match[1]) ? timestamp : null;
}

function hidesContact(value: string) {
  return value.replace(/(?:\+?20|0020)?\s*01[0125](?:[\s-]?\d){8}/g, 'رقم التواصل في الإعلان الأصلي')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, 'البريد في الإعلان الأصلي');
}

export function readEgyptJobsFeed(xml: string, now = Date.now()) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8).flatMap((match) => {
    const item = match[1];
    const title = clean(field(item, 'title'), 140);
    const url = decode(field(item, 'link'));
    const posted = new Date(field(item, 'pubDate'));
    const age = now - posted.getTime();
    if (!/^https:\/\/www\.egyptyjobs\.com\/202[0-9]\/\d{2}\/[a-zA-Z0-9_-]+\.html$/.test(url) || !Number.isFinite(age) || age < -86_400_000 || age > FRESH_MS) return [];
    // Require a specific Qena workplace; a countrywide roundup mentioning Qena isn't one job.
    const description = clean(field(item, 'description'), 12_000);
    const opening = description.slice(0, 500);
    if (!/(وظيف|وظائ|فرص عمل|مطلوب|التوظيف)/.test(title) || !/(قنا|نقادة)/.test(`${title} ${opening}`)) return [];
    if (/(وظائف الجهاز الإداري للدولة|الوظائف الحكومية التي|وظائف بكل المحافظات|نشرة التوظيف|وزير العمل يعلن عن)/.test(title)) return [];
    if (/(الضبعة|العين السخنة|بالمملكة العربية السعودية)/.test(`${title} ${opening}`)) return [];
    if (!/(فرع قنا|بمحافظة قنا|في محافظة قنا|بمدينة قنا|في مدينة قنا|بقنا|بنقادة|في نقادة|جميع مراكز المحافظة)/.test(`${title} ${opening}`)) return [];
    const closing = deadline(description);
    if (closing !== null && closing < now) return [];
    const expires = Math.min(posted.getTime() + FRESH_MS, closing ?? Number.POSITIVE_INFINITY);
    const locality = /(?:بنقادة|في نقادة)/.test(`${title} ${opening}`) ? 'مدينة نقادة' : 'محافظة قنا';
    const organization = /الجهاز المركزي للتعبئة العامة والإحصاء/.test(opening) ? 'الجهاز المركزي للتعبئة العامة والإحصاء' : 'الجهة المُعلنة في المصدر';
    return [{ kind: 'offer', origin: 'external', status: 'published', title,
      organization, locality, field: 'وظائف محافظة قنا',
      description: hidesContact(opening.slice(0, 750)), contact_kind: 'link', contact_value: url,
      contact_consent: false, source_name: 'إعلانات الوظائف الحكومية', source_url: url,
      source_published_at: posted.toISOString(), published_at: posted.toISOString(), expires_at: new Date(expires).toISOString() }];
  });
}

export async function scanEgyptJobs() {
  try {
    const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(6500) });
    if (!response.ok) return { ok: false, jobs: [] };
    const xml = (await response.text()).slice(0, 500_000);
    return xml.includes('<rss') ? { ok: true, jobs: readEgyptJobsFeed(xml) } : { ok: false, jobs: [] };
  } catch { return { ok: false, jobs: [] }; }
}
