import assert from 'node:assert/strict';
import test from 'node:test';
import { readFacebookSearch } from '../supabase/functions/naqada-jobs/facebook-search.ts';

const now = Date.parse('2026-09-25T10:00:00Z');
const item = (title, url, date, description = 'فرصة شغل في نقادة: مطلوب عامل للعمل داخل المدينة. التفاصيل في المنشور الأصلي.') =>
  `<item><title>${title}</title><link>${url.replaceAll('&', '&amp;')}</link><description>${description}</description><pubDate>${date}</pubDate></item>`;

test('recent public Facebook group posts retain direct canonical contact links', () => {
  const xml = `<rss><channel>${item('مطلوب عامل في نقادة', 'https://m.facebook.com/groups/123/posts/456/?ref=share', 'Thu, 24 Sep 2026 10:00:00 GMT')}</channel></rss>`;
  const [job] = readFacebookSearch(xml, now);
  assert.equal(job.source_url, 'https://www.facebook.com/groups/123/posts/456/');
  assert.equal(job.locality, 'مدينة نقادة');
  assert.match(job.source_name, /جروب فيسبوك/);
});

test('old posts, unrelated locations, and group homepages never appear as fresh jobs', () => {
  const xml = `<rss><channel>
    ${item('مطلوب عامل في نقادة', 'https://www.facebook.com/groups/123/posts/999/', 'Tue, 25 Aug 2026 10:00:00 GMT')}
    ${item('مطلوب عامل في الرياض', 'https://www.facebook.com/groups/123/posts/101/', 'Thu, 24 Sep 2026 10:00:00 GMT', 'مطلوب عامل للعمل في الرياض فقط ولا توجد وظيفة في قنا.')}
    ${item('مطلوب عامل في نقادة', 'https://www.facebook.com/groups/123/', 'Thu, 24 Sep 2026 10:00:00 GMT')}
    ${item('مطلوب عامل في نقادة', 'https://example.com/posts/456', 'Thu, 24 Sep 2026 10:00:00 GMT')}
  </channel></rss>`;
  assert.deepEqual(readFacebookSearch(xml, now), []);
});

test('a distinctive Naqada village name qualifies even when the post does not repeat Qena', () => {
  const xml = `<rss><channel>${item('مطلوب موظف في بشلاو', 'https://www.facebook.com/groups/123/posts/457/', 'Thu, 24 Sep 2026 10:00:00 GMT', 'فرصة عمل في بشلاو: مطلوب موظف مبيعات في محل داخل القرية. التفاصيل عبر المنشور الأصلي.')}</channel></rss>`;
  assert.equal(readFacebookSearch(xml, now)[0]?.locality, 'بشلاو');
});
