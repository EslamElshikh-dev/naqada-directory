import assert from 'node:assert/strict';
import test from 'node:test';
import { readForasna, scanForasna } from '../supabase/functions/naqada-jobs/forasna.ts';
import { readTanqeebPosting, scanTanqeeb } from '../supabase/functions/naqada-jobs/tanqeeb.ts';
import { employerListingLinks, readEmployerPosting, scanEmployerJobs } from '../supabase/functions/naqada-jobs/employer-jobs.ts';
import { structuredListingLinks } from '../supabase/functions/naqada-jobs/structured-job.ts';
import { dedupeJobs } from '../supabase/functions/naqada-jobs/job-dedupe.ts';
import { findJobPlace, LOCAL_PLACES } from '../supabase/functions/naqada-jobs/places.ts';
import { FEEDS, PUBLIC_FACEBOOK_SEARCHES, PUBLIC_SOCIAL_FEEDS, VILLAGE_SEARCH_GROUPS } from '../supabase/functions/naqada-jobs/source-catalog.ts';
import { readPublicTelegram } from '../supabase/functions/naqada-jobs/telegram.ts';
import { readFeed } from '../supabase/functions/naqada-jobs/rss.ts';

const NOW = Date.parse('2026-10-03T08:00:00Z');
const tanqeebUrl = 'https://egypt.tanqeeb.com/ar/jobs-in-middle-east/all/jobs/021276365.html';
const employerUrl = 'https://copticorphans.applicantpro.com/jobs/4202775';
const posting = (overrides = {}) => `<script type="application/ld+json">${JSON.stringify({
  '@type': 'JobPosting', title: 'مسؤول مبيعات', description: 'مطلوب مسؤول مبيعات للعمل في نقادة بمحافظة قنا. الشروط وطريقة التقديم في المصدر.',
  datePosted: '2026-09-29T10:00:00Z', validThrough: '2026-10-15T10:00:00Z', hiringOrganization: { name: 'شركة الاختبار' },
  jobLocation: { address: { addressRegion: 'قنا', addressLocality: 'نقادة', addressCountry: 'EG' } }, ...overrides,
})}</script>`;
const card = (location, date = '2026-09-29T10:00:00+03:00', id = 441391) => `<div class="result-wrp">
  <h2 class="job-title"><a href="https://forasna.com/job/p/sales-${id}">مسؤول مبيعات</a></h2>
  <time datetime="${date}">منذ أيام</time><span class="company-name"><a><span>شركة الاختبار</span></a></span>
  <span class="location location-desktop"> - <span>${location}</span></span></div>`;

test('new sources retain the actual village and publication date, without relabelling Qena as Naqada', () => {
  const jobs = readForasna(card('بشلاو، نقادة، قنا') + card('قنا', undefined, 441392) + card('طوخ، القليوبية', undefined, 441393), NOW);
  assert.deepEqual(jobs.map((job) => job.locality), ['بشلاو', 'مدينة قنا']);
  assert.equal(jobs[0].source_published_at, '2026-09-29T07:00:00.000Z');
  assert.equal(readForasna(card('نقادة، قنا', 'منذ يوم'), NOW).length, 0);
  assert.equal(readForasna(card('نقادة، قنا', '2026-08-01T10:00:00Z'), NOW).length, 0);
  assert.equal(readTanqeebPosting(posting(), tanqeebUrl, NOW)?.locality, 'مدينة نقادة');
  const qena = posting({ description: 'مسؤول مبيعات في مدينة قنا فقط.', jobLocation: { address: { addressRegion: 'Qena', addressCountry: 'EG' } } });
  assert.equal(readTanqeebPosting(qena, tanqeebUrl, NOW)?.locality, 'محافظة قنا');
});

test('structured imports reject stale, expired, undated, impossible dates and mixed-region jobs', () => {
  for (const override of [
    { datePosted: '2026-08-01T10:00:00Z' }, { datePosted: undefined }, { datePosted: '2026-09-31T10:00:00Z' },
    { datePosted: '2026-10-05T10:00:00Z' }, { validThrough: '2026-10-01T10:00:00Z' }, { validThrough: '2026-10-32' },
    { jobLocation: [{ address: { addressRegion: 'قنا' } }, { address: { addressRegion: 'القاهرة' } }] },
    { jobLocation: { address: { addressRegion: 'قنا', addressCountry: 'SA' } } },
    { jobLocation: { address: { addressRegion: 'القليوبية', addressLocality: 'القناطر' } } },
  ]) assert.equal(readTanqeebPosting(posting(override), tanqeebUrl, NOW), null);
  assert.equal(readTanqeebPosting(posting(), 'https://egypt.tanqeeb.com/ar/company/123', NOW), null);
  assert.equal(readTanqeebPosting(posting(), 'https://example.com/jobs/123.html', NOW), null);
});

test('official employer openings are discovered from the current list, with a capped real lifetime', () => {
  const listing = { success: true, data: { jobs: [
    { title: 'Field Coordinator Qena', iso3: 'EGY', jobUrl: employerUrl },
    { title: 'Coordinator Naqada', iso3: 'USA', jobUrl: employerUrl },
    { title: 'Coordinator Qena', iso3: 'EGY', jobUrl: 'https://example.com/123' },
    { title: 'Coordinator Cairo', iso3: 'EGY', jobUrl: 'https://copticorphans.applicantpro.com/jobs/123' },
  ] } };
  assert.deepEqual(employerListingLinks(listing), [employerUrl]);
  assert.deepEqual(employerListingLinks({ success: true, data: { jobs: [] } }), []);
  assert.equal(employerListingLinks({ success: false }), null);
  const html = posting({ title: 'Field Coordinator Qena', description: 'Hiring a coordinator for a programme in Naqada, Qus and Deshna.',
    datePosted: '2026-09-10 00:00:00', validThrough: '2031-09-10 00:00:00T23:59',
    jobLocation: { address: { addressRegion: 'Qena Governorate', addressCountry: 'EG' } } });
  const job = readEmployerPosting(html, employerUrl, NOW);
  assert.equal(job.locality, 'مدينة نقادة');
  assert.equal(job.source_published_at, '2026-09-10T00:00:00.000Z');
  assert.equal(job.expires_at, '2026-10-10T00:00:00.000Z');
  assert.equal(readTanqeebPosting(html, tanqeebUrl, NOW), null);
  assert.equal(readEmployerPosting(html, employerUrl, Date.parse('2026-10-11')), null);
});

test('English vacancies and village spellings are found while promotional hashtags do not set the workplace', () => {
  assert.deepEqual(findJobPlace('Hiring in Naqada, Qena'), { locality: 'مدينة نقادة', governorate: 'قنا' });
  assert.equal(findJobPlace('مطلوب موظف في الأوسط قامولا، قنا')?.locality, 'الأوسط قمولا');
  assert.equal(findJobPlace('مطلوب موظف في طوخ القليوبية', 'نشرة وظائف قنا'), null);
  const message = (id, text, date = '2026-09-29T08:00:00Z') => `<div class="tgme_widget_message_wrap"><div data-post="QenaLuxorJobs/${id}"></div><div class="tgme_widget_message_text">${text}</div><time datetime="${date}"></time></div>`;
  const jobs = readPublicTelegram(message(12, 'Hiring sales staff in Naqada, Qena. Apply through the original announcement.')
    + message(13, 'مطلوب عامل في المحروسة #وظائف_نقادة #وظائف_قنا')
    + message(14, 'Hiring staff in Naqada, Qena.', '2023-09-01T10:00:00Z'), 'وظائف صعيد مصر', 'QenaLuxorJobs', NOW);
  assert.deepEqual(jobs.map((job) => job.source_url), ['https://t.me/QenaLuxorJobs/12']);
  const xml = `<rss><item><title>Hiring sales staff in Naqada</title><description>New job opening in Naqada, Qena.</description><link>https://example.com/vacancy/1</link><pubDate>Tue, 29 Sep 2026 08:00:00 GMT</pubDate></item></rss>`;
  assert.equal(readFeed(xml, 'المصدر', NOW)[0]?.locality, 'مدينة نقادة');
  assert.deepEqual(readFeed(xml.replace(/<pubDate>.*?<\/pubDate>/, ''), 'المصدر', NOW), []);
});

test('deduplication keeps different anonymous employers and blocks existing moderated adverts across sources', () => {
  const job = { source_url: 'https://example.com/jobs/1', title: 'مسؤول مبيعات', organization: 'شركة الاختبار', locality: 'مدينة قنا', source_published_at: '2026-09-29T10:00:00Z' };
  const mirror = { ...job, locality: 'محافظة قنا', source_url: 'https://another.example/jobs/1' };
  assert.equal(dedupeJobs([job, mirror]).length, 1);
  assert.equal(dedupeJobs([{ ...job, source_url: `${job.source_url}?utm_source=facebook` }], [job]).length, 0);
  assert.equal(dedupeJobs([mirror], [job]).length, 0);
  assert.equal(dedupeJobs([job, { ...mirror, source_published_at: '2026-09-30T10:00:00Z' }]).length, 2);
  assert.equal(dedupeJobs([job, mirror].map((entry) => ({ ...entry, organization: 'جهة التوظيف في المصدر' }))).length, 2);
  assert.equal(dedupeJobs([job, mirror].map((entry) => ({ ...entry, organization: 'شركة غير معلنة' }))).length, 2);
  const oldSlug = { ...job, source_url: 'https://forasna.com/job/p/old-company-441405' };
  assert.equal(dedupeJobs([{ ...mirror, source_url: 'https://forasna.com/job/p/new-company-441405' }], [oldSlug]).length, 0);
});

test('all known Naqada villages have public search coverage and every Telegram search retains its channel identity', () => {
  const groups = VILLAGE_SEARCH_GROUPS.join(' ');
  for (const place of LOCAL_PLACES.filter((item) => !item.includes('نقادة'))) assert.ok(groups.includes(`"${place}"`), place);
  assert.ok(groups.includes(' OR '));
  const urls = [...FEEDS, ...PUBLIC_FACEBOOK_SEARCHES, ...PUBLIC_SOCIAL_FEEDS].map((source) => source.url);
  assert.equal(new Set(urls).size, urls.length);
  for (const page of PUBLIC_SOCIAL_FEEDS) assert.equal(new URL(page.url).pathname, `/s/${page.channel}`);
});

test('source outages stay isolated and an empty current employer list cannot import an old bookmarked job', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ success: true, data: { jobs: [] } }); };
  assert.deepEqual(await scanEmployerJobs(), { ok: true, jobs: [] });
  assert.equal(calls, 1);
  globalThis.fetch = async (url) => {
    if (decodeURIComponent(String(url)).includes('وظائف-نقادة')) throw new Error('source unavailable');
    return new Response(card('قنا', new Date(Date.now() - 86_400_000).toISOString()));
  };
  const partial = await scanForasna();
  assert.equal(partial.ok, true);
  assert.ok(partial.jobs.length);
  globalThis.fetch = async () => { throw new Error('source unavailable'); };
  assert.deepEqual(await scanTanqeeb(), { ok: false, jobs: [] });
});

test('aggregator discovery accepts only bounded direct posting URLs', () => {
  const itemList = `<script type="application/ld+json">${JSON.stringify({ '@type': 'ItemList', itemListElement: [
    { url: tanqeebUrl }, { url: tanqeebUrl }, { url: 'https://example.com/a' }, { url: 'javascript:alert(1)' },
  ] })}</script>`;
  const accept = (url) => /^https:\/\/egypt\.tanqeeb\.com\/ar\/jobs-in-middle-east\/all\/jobs\/\d+\.html$/.test(url);
  assert.deepEqual(structuredListingLinks(itemList, tanqeebUrl, accept), [tanqeebUrl]);
});
