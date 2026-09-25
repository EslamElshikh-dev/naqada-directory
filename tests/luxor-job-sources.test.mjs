import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalLuxorLocality, findJobPlace, findLuxorPlace, LUXOR_PLACES } from '../supabase/functions/naqada-jobs/places.ts';
import { readForasnaLuxor } from '../supabase/functions/naqada-jobs/forasna-luxor.ts';
import { readJobsArabPosting } from '../supabase/functions/naqada-jobs/jobs-arab.ts';
import { readEgyptJobBankPosting } from '../supabase/functions/naqada-jobs/egypt-job-bank.ts';
import { readFacebookSearch } from '../supabase/functions/naqada-jobs/facebook-search.ts';
import { readPublicTelegram } from '../supabase/functions/naqada-jobs/telegram.ts';

const NOW = Date.parse('2026-09-25T12:00:00Z');
const link = 'https://forasna.com/job/p/%D9%81%D9%86%D9%8A-%D9%86%D9%82%D8%A7%D8%B4%D8%A9-%D8%A7%D9%84%D8%A3%D9%82%D8%B5%D8%B1-441391';

test('Luxor villages and centres are matched with governorate context, not confused with Qena', () => {
  assert.ok(LUXOR_PLACES.includes('العديسات قبلي'));
  assert.equal(canonicalLuxorLocality('الاقصر'), 'مدينة الأقصر');
  assert.deepEqual(findJobPlace('مطلوب عامل في إسنا'), { locality: 'مدينة إسنا', governorate: 'الأقصر' });
  assert.equal(findLuxorPlace('مطلوب موظف في قرية الدير بالأقصر'), 'الدير');
  assert.equal(findLuxorPlace('مطلوب محاسب بالأقصر'), 'محافظة الأقصر');
  assert.deepEqual(findJobPlace('مطلوب عامل في العديسات قبلي'), { locality: 'العديسات قبلي', governorate: 'الأقصر' });
  assert.deepEqual(findJobPlace('مطلوب عامل في بشلاو'), { locality: 'بشلاو', governorate: 'قنا' });
  assert.equal(findJobPlace('وظائف قنا والأقصر', 'فرص بكل المحافظات'), null);
  assert.equal(findJobPlace('مطلوب عامل في القاهرة', 'القرية القريبة من التجمع'), null);
  assert.equal(findJobPlace('مطلوب بمطار الغردقة', 'https://t.me/QenaLuxorJobs'), null);
});

test('Forasna Luxor cards need an exact recent date, direct job URL and Luxor workplace', () => {
  const card = (href, location, date) => `<div class="result-wrp"><h2 class="job-title"><a href="${href}"><span>فني نقاشة</span></a></h2>
    <time class="job-date" datetime="${date}">منذ يومين</time>
    <span class="company-name"><a href="https://forasna.com/company/34182"><span>شركة دهانات الجزيرة</span></a></span>
    <span class="location location-desktop"> - <span>${location}</span></span></div>`;
  const html = `${card(link, 'إسنا، الأقصر', '2026-09-23T10:04:25+03:00')}
    ${card('https://forasna.com/company/34182', 'الأقصر', '2026-09-23T10:04:25+03:00')}
    ${card(link.replace('441391', '441392'), 'قنا', '2026-09-23T10:04:25+03:00')}
    ${card(link.replace('441391', '441393'), 'الأقصر', '2026-09-01T10:04:25+03:00')}`;
  const [job] = readForasnaLuxor(html, NOW);
  assert.equal(readForasnaLuxor(html, NOW).length, 1);
  assert.equal(job.source_url, link);
  assert.equal(job.locality, 'مدينة إسنا');
  assert.equal(job.governorate, 'الأقصر');
  assert.equal(job.source_published_at, '2026-09-23T07:04:25.000Z');
});

test('structured job listings retain Luxor region and direct application link', () => {
  const jobsArabUrl = 'https://www.jobs-arab.com/eg/jobs/772541/';
  const arabHtml = `<script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', title: 'وظائف الأقصر - مندوب مبيعات', datePosted: '2026-09-23T11:00:00Z', description: 'مطلوب مندوب مبيعات للعمل في مدينة الأقصر لدى شركة متخصصة في كاميرات المراقبة', jobLocation: { address: { addressRegion: 'محافظة الأقصر', addressLocality: 'مدينة الأقصر' } } })}</script>`;
  assert.equal(readJobsArabPosting(arabHtml, jobsArabUrl, NOW)?.governorate, 'الأقصر');
  const bankUrl = 'https://egjobank.com/jobs/sales-luxor-a15b6';
  const bankHtml = `<script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', url: bankUrl, title: 'مندوب مبيعات', datePosted: '2026-09-23T11:00:00Z', validThrough: '2026-10-01T11:00:00Z', description: 'فرصة مبيعات في محافظة الأقصر لخدمة العملاء المحليين', jobLocation: { address: { addressRegion: 'الأقصر', addressLocality: 'إسنا' } } })}</script>`;
  assert.equal(readEgyptJobBankPosting(bankHtml, bankUrl, NOW)?.governorate, 'الأقصر');
  assert.equal(readEgyptJobBankPosting(bankHtml, bankUrl, NOW)?.contact_value, bankUrl);
});

test('public Facebook Luxor village announcements keep a direct dated post', () => {
  const xml = `<rss><item><title>مطلوب موظف في العديسات قبلي بالأقصر</title><link>https://www.facebook.com/groups/123/posts/789/</link><description>فرصة عمل في العديسات قبلي بمحافظة الأقصر للعمل مع فريق المبيعات.</description><pubDate>Thu, 24 Sep 2026 10:00:00 GMT</pubDate></item></rss>`;
  assert.deepEqual(readFacebookSearch(xml, NOW).map((job) => [job.governorate, job.locality]), [['الأقصر', 'العديسات قبلي']]);
});

test('Telegram channel footers cannot turn Asyut or Hurghada announcements into Luxor jobs', () => {
  const post = (id, text) => `<div class="tgme_widget_message_wrap"><div data-post="QenaLuxorJobs/${id}"></div><div class="tgme_widget_message_text js-message_text">${text}</div><time datetime="2026-09-24T08:00:00Z"></time></div>`;
  const footer = '🔥 تابع فرص عمل الصعيد أولًا بأول، وشاركها مع من يبحث عن عمل. https://t.me/QenaLuxorJobs';
  const html = post(39949, `مطلوب مدير فرع بمحافظة أسيوط. ${footer}`) + post(39958, `مطلوب موظف بمطار الغردقة. ${footer}`)
    + post(39960, 'مطلوب محاسب في إسنا للعمل في مقر الشركة. للمزيد راجع الإعلان الأصلي.');
  const jobs = readPublicTelegram(html, 'وظائف صعيد مصر', 'QenaLuxorJobs', NOW);
  assert.deepEqual(jobs.map((job) => [job.locality, job.source_url]), [['مدينة إسنا', 'https://t.me/QenaLuxorJobs/39960']]);
});
