import { canonicalLuxorLocality } from './places.ts';

const LISTING_URLS = [
  'https://www.jobs-arab.com/eg/job-location/%D9%82%D9%86%D8%A7/',
  'https://www.jobs-arab.com/eg/job-location/%D8%A7%D9%84%D8%A7%D9%82%D8%B5%D8%B1/',
];
const POST_URL = /^https:\/\/www\.jobs-arab\.com\/eg\/jobs\/\d+\/$/;
const FRESH_MS = 14 * 86_400_000;

function clean(value: unknown, limit = 1000) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
  })[entity] || entity).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw) => {
    const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function withoutContacts(value: string) {
  return value.replace(/(?:\+?20|0020)?\s*01[0125](?:[\s-]?\d){8}/g, 'رقم التواصل في المصدر')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, 'البريد في المصدر');
}

export function jobsArabLinks(html: string) {
  const results = [...html.matchAll(/<li\s+class=["']job["'][^>]*>([\s\S]*?)<\/li>/gi)].slice(0, 12);
  return [...new Set(results.flatMap((match) => {
    const href = /<h2\s+class=["']job-title["'][^>]*>\s*<a\s+href=["']([^"']+)/i.exec(match[1])?.[1];
    return href && POST_URL.test(href) ? [href] : [];
  }))].slice(0, 8);
}

export function readJobsArabPosting(html: string, url: string, now = Date.now()) {
  if (!POST_URL.test(url)) return null;
  const scripts = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const postings = scripts.flatMap((match) => {
    try {
      const data = JSON.parse(match[1]);
      return [data, ...(Array.isArray(data['@graph']) ? data['@graph'] : [])];
    } catch { return []; }
  });
  const post = postings.find((node) => node?.['@type'] === 'JobPosting');
  if (!post) return null;
  const date = new Date(post.datePosted);
  const age = now - date.getTime();
  // This publisher occasionally labels Cairo-local clock time as UTC. Cap that
  // small future skew at the scan time instead of displaying a future date.
  if (!Number.isFinite(age) || age < -4 * 3_600_000 || age > FRESH_MS) return null;
  const publishedAt = new Date(Math.min(date.getTime(), now));
  const location = Array.isArray(post.jobLocation) ? post.jobLocation[0] : post.jobLocation;
  const address = location?.address;
  const region = clean(address?.addressRegion, 120);
  const place = clean(address?.addressLocality, 120);
  const governorate = /الأقصر|الاقصر/.test(region) ? 'الأقصر' : /قنا/.test(region) ? 'قنا' : null;
  if (!governorate || !place || /القناطر/.test(place)) return null;
  const title = clean(post.title, 140).replace(/^وظائف (?:قنا|الأقصر|الاقصر)\s*-\s*/, '');
  if (title.length < 3) return null;
  const company = clean(post.hiringOrganization?.name, 120) || 'جهة التوظيف في المصدر';
  const details = withoutContacts(clean(post.description, 750));
  return { kind: 'offer', origin: 'external', status: 'published', title, organization: company,
    locality: governorate === 'الأقصر' ? canonicalLuxorLocality(place) : place === 'نقادة' ? 'مدينة نقادة' : place, governorate, field: `وظائف محافظة ${governorate}`,
    description: details.length >= 20 ? details : `فرصة عمل في ${place} منشورة على وظائف العرب. افتح الإعلان الأصلي للشروط وطريقة التقديم.`,
    contact_kind: 'link', contact_value: url, contact_consent: false,
    source_name: 'وظائف العرب', source_url: url, source_published_at: publishedAt.toISOString(), published_at: publishedAt.toISOString(),
    expires_at: new Date(publishedAt.getTime() + FRESH_MS).toISOString() };
}

export async function scanJobsArab() {
  const scans = await Promise.all(LISTING_URLS.map(async (listing) => {
    try {
      const page = await fetch(listing, { signal: AbortSignal.timeout(6500) });
      if (!page.ok) return { ok: false, jobs: [] };
      const links = jobsArabLinks((await page.text()).slice(0, 250_000));
      const jobs = await Promise.all(links.map(async (link) => {
      try {
        const response = await fetch(link, { signal: AbortSignal.timeout(6500) });
        return response.ok ? readJobsArabPosting((await response.text()).slice(0, 210_000), link) : null;
      } catch { return null; }
      }));
      return { ok: true, jobs: jobs.filter((job): job is NonNullable<typeof job> => job !== null) };
    } catch { return { ok: false, jobs: [] }; }
  }));
  return { ok: scans.some((scan) => scan.ok), jobs: scans.flatMap((scan) => scan.jobs) };
}
