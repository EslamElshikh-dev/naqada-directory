const LIST_URL = 'https://egjobank.com/jobs/in/qena';
const POST_URL = /^https:\/\/egjobank\.com\/jobs\/[a-z0-9-]+$/;
const FRESH_MS = 14 * 86_400_000;

function schema(html: string, type: string) {
  for (const script of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json = JSON.parse(script[1]);
      const nodes = [json, ...(Array.isArray(json['@graph']) ? json['@graph'] : [])];
      const result = nodes.find((node) => node?.['@type'] === type);
      if (result) return result;
    } catch { /* Ignore malformed structured data and keep scanning. */ }
  }
  return null;
}

function clean(value: unknown, limit: number) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

export function egyptJobBankLinks(html: string) {
  const list = schema(html, 'ItemList');
  return [...new Set((Array.isArray(list?.itemListElement) ? list.itemListElement : [])
    .slice(0, 15).map((item: { url?: unknown }) => item.url).filter((url: unknown): url is string => typeof url === 'string' && POST_URL.test(url)))].slice(0, 8);
}

export function readEgyptJobBankPosting(html: string, url: string, now = Date.now()) {
  if (!POST_URL.test(url)) return null;
  const post = schema(html, 'JobPosting');
  if (!post || post.url !== url) return null;
  const posted = new Date(post.datePosted);
  const expires = new Date(post.validThrough);
  const age = now - posted.getTime();
  if (!Number.isFinite(age) || age < -4 * 3_600_000 || age > FRESH_MS || !Number.isFinite(expires.getTime()) || expires.getTime() <= now) return null;
  const region = clean(post.jobLocation?.address?.addressRegion, 120);
  const location = clean(post.jobLocation?.address?.addressLocality, 120);
  if (!/قنا/.test(region) || !location || /القناطر/.test(location)) return null;
  const title = clean(post.title, 140);
  if (title.length < 3) return null;
  const publishedAt = new Date(Math.min(now, posted.getTime()));
  const company = clean(post.hiringOrganization?.name, 120) || 'جهة التوظيف في المصدر';
  const details = clean(post.description, 750).replace(/(?:\+?20|0020)?\s*01[0125](?:[\s-]?\d){8}/g, 'رقم التواصل في المصدر');
  return { kind: 'offer', origin: 'external', status: 'published', title, organization: company,
    locality: location === 'نقادة' ? 'مدينة نقادة' : location, field: 'وظائف محافظة قنا',
    description: details.length >= 20 ? details : `فرصة عمل في ${location}. افتح الإعلان الأصلي لقراءة الشروط وطريقة التقديم.`,
    contact_kind: 'link', contact_value: url, contact_consent: false,
    source_name: 'بنك الوظائف المصري', source_url: url, source_published_at: publishedAt.toISOString(), published_at: publishedAt.toISOString(),
    expires_at: new Date(Math.min(publishedAt.getTime() + FRESH_MS, expires.getTime())).toISOString() };
}

export async function scanEgyptJobBank() {
  try {
    const page = await fetch(LIST_URL, { signal: AbortSignal.timeout(6500) });
    if (!page.ok) return { ok: false, jobs: [] };
    const links = egyptJobBankLinks((await page.text()).slice(0, 240_000));
    const jobs = await Promise.all(links.map(async (link) => {
      try {
        const reply = await fetch(link, { signal: AbortSignal.timeout(6500) });
        return reply.ok ? readEgyptJobBankPosting((await reply.text()).slice(0, 190_000), link) : null;
      } catch { return null; }
    }));
    return { ok: true, jobs: jobs.filter((job): job is NonNullable<typeof job> => job !== null) };
  } catch { return { ok: false, jobs: [] }; }
}
