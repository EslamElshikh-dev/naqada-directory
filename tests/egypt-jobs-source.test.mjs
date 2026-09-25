import assert from 'node:assert/strict';
import test from 'node:test';
import { readEgyptJobsFeed } from '../supabase/functions/naqada-jobs/egypt-jobs.ts';

const NOW = Date.parse('2026-09-25T12:00:00Z');

function item(title, description, date = 'Sat, 19 Sep 2026 15:23:04 +0000', url = 'https://www.egyptyjobs.com/2026/09/2027-15000.html') {
  return `<item><title>${title}</title><description>${description.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</description><link>${url}</link><pubDate>${date}</pubDate></item>`;
}

test('a recent employer announcement covering Qena centres retains its source and publication date', () => {
  const xml = `<rss><channel>${item('وظائف الحصر الخرائطي 2027', '<p>يعلن الجهاز المركزي للإحصاء - فرع قنا عن فرص عمل في جميع مراكز المحافظة.</p><p>التقديم بمقر فرع قنا.</p>')}</channel></rss>`;
  const [job] = readEgyptJobsFeed(xml, NOW);
  assert.equal(job?.locality, 'محافظة قنا');
  assert.equal(job?.source_url, 'https://www.egyptyjobs.com/2026/09/2027-15000.html');
  assert.equal(job?.source_published_at, '2026-09-19T15:23:04.000Z');
});

test('closed applications, nationwide roundups and other regions do not become active Qena offers', () => {
  const closed = item('وظائف محافظة قنا', '<p>فرص عمل في محافظة قنا. التقديم حتى الخميس الموافق 24 سبتمبر 2026.</p>');
  const roundup = item('نشرة التوظيف الحكومية لـ12 محافظة', '<p>فرص في محافظة قنا والقاهرة ومناطق أخرى.</p>');
  const elsewhere = item('وظائف مشروع الضبعة', '<p>تقبل الطلبات في مديرية العمل بقنا، ومكان العمل محطة الضبعة.</p>');
  assert.deepEqual(readEgyptJobsFeed(`<rss>${closed}${roundup}${elsewhere}</rss>`, NOW), []);
});
