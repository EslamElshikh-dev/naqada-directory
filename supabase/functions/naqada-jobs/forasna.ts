import { findJobPlace, findLuxorPlace } from './places.ts';

export const FORASNA_LISTS = ['نقادة', 'قنا', 'الاقصر'].map((place) =>
  `https://forasna.com/a/${encodeURIComponent(`وظائف-${place}`)}`);
const FRESH_MS = 14 * 86_400_000;

function clean(value: string, limit: number) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
  })[entity] || entity).replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function readForasna(html: string, now = Date.now()) {
  return [...html.matchAll(/<div class="result-wrp"[^>]*>([\s\S]*?)(?=<div class="result-wrp"|<footer\b|$)/gi)].slice(0, 24).flatMap((match) => {
    const card = match[1];
    const job = /<h2 class="job-title"[^>]*>[\s\S]*?<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(card);
    const url = job?.[1]?.replaceAll('&amp;', '&');
    if (!url || !/^https:\/\/forasna\.com\/job\/p\/[\w%\-]+-\d+$/i.test(url)) return [];
    const title = clean(job![2], 140);
    const company = clean(/<span class="company-name"[^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(card)?.[1] || '', 120);
    const location = clean(/<span class="location location-desktop"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i.exec(card)?.[1] || '', 120);
    const posted = new Date(/<time\b[^>]*datetime="([^"]+)"/i.exec(card)?.[1] || '');
    const age = now - posted.getTime();
    if (title.length < 3 || !Number.isFinite(age) || age < -4 * 3_600_000 || age > FRESH_MS) return [];
    const isLuxor = /(الأقصر|الاقصر)/.test(location);
    if (!isLuxor && !/(قنا|نقادة|نقاده)/.test(location)) return [];
    if (/(القليوبية|اسوان|أسوان)/.test(location)) return [];
    const governorate = isLuxor ? 'الأقصر' : 'قنا';
    const locality = isLuxor ? findLuxorPlace(location) || 'مدينة الأقصر'
      : findJobPlace(location)?.locality || 'مدينة قنا';
    const publishedAt = new Date(Math.min(posted.getTime(), now));
    return [{ kind: 'offer', origin: 'external', status: 'published', title,
      organization: company || 'جهة التوظيف في المصدر', locality, governorate, field: `وظائف محافظة ${governorate}`,
      description: `فرصة ${title} في ${location} منشورة على فرصنا. راجع الإعلان الأصلي لمعرفة الشروط وطريقة التقديم والتأكد من استمرار التوظيف.`,
      contact_kind: 'link', contact_value: url, contact_consent: false, source_name: 'فرصنا', source_url: url,
      source_published_at: publishedAt.toISOString(), published_at: publishedAt.toISOString(),
      expires_at: new Date(publishedAt.getTime() + FRESH_MS).toISOString() }];
  });
}

export async function scanForasna() {
  const scans = await Promise.all(FORASNA_LISTS.map(async (url) => {
    try {
      const reply = await fetch(url, { signal: AbortSignal.timeout(6500) });
      if (!reply.ok) return { ok: false, jobs: [] };
      const html = (await reply.text()).slice(0, 450_000);
      // A genuine empty results page is a completed scan, not a failure.
      return /result-wrp|لا توجد وظائف|0 وظائف خالية/.test(html)
        ? { ok: true, jobs: readForasna(html) } : { ok: false, jobs: [] };
    } catch { return { ok: false, jobs: [] }; }
  }));
  return { ok: scans.some((scan) => scan.ok), jobs: scans.flatMap((scan) => scan.jobs) };
}
