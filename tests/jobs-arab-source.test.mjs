import assert from 'node:assert/strict';
import test from 'node:test';
import { jobsArabLinks, readJobsArabPosting } from '../supabase/functions/naqada-jobs/jobs-arab.ts';

const NOW = Date.parse('2026-09-25T12:00:00Z');
const URL = 'https://www.jobs-arab.com/eg/jobs/772699/';

function posting({ date = '2026-09-22T20:23:31+00:00', place = 'قنا', region = 'محافظة قنا' } = {}) {
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [{
    '@type': 'JobPosting', title: 'وظائف قنا - مطلوب مندوب مبيعات عبر الهاتف', datePosted: date,
    description: '<p>العمل بنظام الشفت المسائي في محافظة قنا. للتواصل 01012345678</p>',
    hiringOrganization: { name: 'شركة أدوية كبرى' },
    jobLocation: { address: { addressLocality: place, addressRegion: region } },
  }] })}</script>`;
}

test('only direct job links from the Qena list are considered', () => {
  const html = `<li class="job"><h2 class="job-title"><a href="${URL}">وظيفة</a></h2></li>
    <li class="job"><h2 class="job-title"><a href="https://elsewhere.example/eg/jobs/666/">وظيفة أخرى</a></h2></li>`;
  assert.deepEqual(jobsArabLinks(html), [URL]);
});

test('a recent Qena JobPosting keeps its own date, place, contact link and hides contact details', () => {
  const job = readJobsArabPosting(posting(), URL, NOW);
  assert.equal(job?.locality, 'قنا');
  assert.equal(job?.source_url, URL);
  assert.equal(job?.source_published_at, '2026-09-22T20:23:31.000Z');
  assert.match(job?.title || '', /مندوب مبيعات/);
  assert.doesNotMatch(job?.description || '', /01012345678/);
});

test('expired postings and jobs outside Qena are never published', () => {
  assert.equal(readJobsArabPosting(posting({ date: '2026-08-22T20:23:31Z' }), URL, NOW), null);
  assert.equal(readJobsArabPosting(posting({ place: 'القاهرة', region: 'القاهرة' }), URL, NOW), null);
  assert.equal(readJobsArabPosting(posting(), 'https://other.example/jobs/772699/', NOW), null);
});

test('a small publisher timezone skew never shows a future posting date', () => {
  const job = readJobsArabPosting(posting({ date: '2026-09-25T14:00:00Z' }), URL, NOW);
  assert.equal(job?.published_at, '2026-09-25T12:00:00.000Z');
  assert.equal(readJobsArabPosting(posting({ date: '2026-09-26T01:00:00Z' }), URL, NOW), null);
});
