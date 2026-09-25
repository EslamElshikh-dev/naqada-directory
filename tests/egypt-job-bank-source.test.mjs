import assert from 'node:assert/strict';
import test from 'node:test';
import { egyptJobBankLinks, readEgyptJobBankPosting } from '../supabase/functions/naqada-jobs/egypt-job-bank.ts';

const NOW = Date.parse('2026-09-25T12:00:00Z');
const URL = 'https://egjobank.com/jobs/warehouse-staff-qena-a15b6';
const script = (json) => `<script type="application/ld+json">${JSON.stringify(json)}</script>`;

function posting(datePosted = '2026-09-22T11:00:00Z', validThrough = '2026-10-01T23:59:00Z', locality = 'قنا') {
  return script({ '@type': 'JobPosting', title: 'مسؤول مخزن', description: 'مطلوب مسؤول مخزن في قنا للمتابعة اليومية والتقديم عبر المنصة',
    url: URL, datePosted, validThrough, hiringOrganization: { name: 'شركة توريد' },
    jobLocation: { address: { addressRegion: 'قنا', addressLocality: locality } } });
}

test('the Qena listing yields only direct links and preserves link, location and expiry', () => {
  const list = script({ '@type': 'ItemList', itemListElement: [{ url: URL }, { url: URL }, { url: 'https://example.com/jobs/other' }] });
  assert.deepEqual(egyptJobBankLinks(list), [URL]);
  const job = readEgyptJobBankPosting(posting(), URL, NOW);
  assert.equal(job?.locality, 'قنا');
  assert.equal(job?.contact_value, URL);
  assert.equal(job?.expires_at, '2026-10-01T23:59:00.000Z');
});

test('stale or expired advertisements and addresses outside Qena are skipped', () => {
  assert.equal(readEgyptJobBankPosting(posting('2026-06-24T03:35:52Z', '2026-09-22T03:35:52Z'), URL, NOW), null);
  assert.equal(readEgyptJobBankPosting(posting('2026-09-22T11:00:00Z', '2026-09-24T23:59:00Z'), URL, NOW), null);
  assert.equal(readEgyptJobBankPosting(posting('2026-09-22T11:00:00Z', '2026-10-01T23:59:00Z', ''), URL, NOW), null);
});
