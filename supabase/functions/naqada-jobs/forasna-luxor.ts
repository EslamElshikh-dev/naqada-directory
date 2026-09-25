import { findLuxorPlace } from './places.ts';

const LIST_URL = 'https://forasna.com/a/%D9%88%D8%B8%D8%A7%D8%A6%D9%81-%D8%A7%D9%84%D8%A7%D9%82%D8%B5%D8%B1';
const FRESH_MS = 14 * 86_400_000;

function clean(value: string, limit: number) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
  })[entity] || entity).replace(/\s+/g, ' ').trim().slice(0, limit);
}

// Only direct postings shown in the Luxor list, with an exact publication date
// and a Luxor workplace, are included. Relative "منذ يوم" labels aren't used.
export function readForasnaLuxor(html: string, now = Date.now()) {
  return [...html.matchAll(/<div class="result-wrp"[^>]*>([\s\S]*?)(?=<div class="result-wrp"|<footer\b|$)/gi)].slice(0, 20).flatMap((match) => {
    const card = match[1];
    const job = /<h2 class="job-title"[^>]*>[\s\S]*?<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(card);
    const url = job?.[1]?.replaceAll('&amp;', '&');
    if (!url || !/^https:\/\/forasna\.com\/job\/p\/[\w%\-]+-\d+$/i.test(url)) return [];
    const title = clean(job[2], 140);
    const company = clean(/<span class="company-name"[^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(card)?.[1] || '', 120);
    const location = clean(/<span class="location location-desktop"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i.exec(card)?.[1] || '', 120);
    const posted = new Date(/<time\b[^>]*datetime="([^"]+)"/i.exec(card)?.[1] || '');
    const age = now - posted.getTime();
    if (title.length < 3 || !/(الأقصر|الاقصر)/.test(location) || !Number.isFinite(age) || age < -4 * 3_600_000 || age > FRESH_MS) return [];
    const publishedAt = new Date(Math.min(posted.getTime(), now));
    const locality = findLuxorPlace(location) || 'مدينة الأقصر';
    return [{ kind: 'offer', origin: 'external', status: 'published', title,
      organization: company || 'جهة التوظيف في المصدر', locality, governorate: 'الأقصر', field: 'وظائف محافظة الأقصر',
      description: `فرصة ${title} في ${location} منشورة على فرصنا. راجع الإعلان الأصلي لمعرفة الشروط وطريقة التقديم والتأكد من استمرار التوظيف.`,
      contact_kind: 'link', contact_value: url, contact_consent: false, source_name: 'فرصنا', source_url: url,
      source_published_at: publishedAt.toISOString(), published_at: publishedAt.toISOString(),
      expires_at: new Date(publishedAt.getTime() + FRESH_MS).toISOString() }];
  });
}

export async function scanForasnaLuxor() {
  try {
    const reply = await fetch(LIST_URL, { signal: AbortSignal.timeout(6500) });
    if (!reply.ok) return { ok: false, jobs: [] };
    const html = (await reply.text()).slice(0, 450_000);
    return html.includes('result-wrp') ? { ok: true, jobs: readForasnaLuxor(html) } : { ok: false, jobs: [] };
  } catch { return { ok: false, jobs: [] }; }
}
