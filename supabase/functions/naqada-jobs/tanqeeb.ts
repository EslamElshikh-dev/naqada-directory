import { readStructuredJob, structuredListingLinks } from './structured-job.ts';

const LIST_URL = `https://egypt.tanqeeb.com/ar/s/${encodeURIComponent('وظائف')}/${encodeURIComponent('وظائف-مصر')}/${encodeURIComponent('وظائف-فى-قنا')}`;
export const tanqeebPostUrl = (url: string) => /^https:\/\/egypt\.tanqeeb\.com\/ar\/jobs-in-middle-east\/all\/jobs\/\d+\.html$/.test(url);
export const readTanqeebPosting = (html: string, url: string, now = Date.now()) =>
  readStructuredJob(html, url, { name: 'تنقيب', accepts: tanqeebPostUrl }, now);

export async function scanTanqeeb() {
  try {
    const reply = await fetch(LIST_URL, { signal: AbortSignal.timeout(7000) });
    if (!reply.ok) return { ok: false, jobs: [] };
    const html = (await reply.text()).slice(0, 600_000);
    if (!html.includes('ItemList')) return { ok: false, jobs: [] };
    const urls = structuredListingLinks(html, LIST_URL, tanqeebPostUrl, 8);
    const jobs = await Promise.all(urls.map(async (url) => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
        return response.ok ? readTanqeebPosting((await response.text()).slice(0, 250_000), url) : null;
      } catch { return null; }
    }));
    return { ok: true, jobs: jobs.filter((job): job is NonNullable<typeof job> => job !== null) };
  } catch { return { ok: false, jobs: [] }; }
}
