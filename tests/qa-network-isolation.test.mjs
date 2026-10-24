import test from 'node:test';
import assert from 'node:assert/strict';
import { readOnlyFetch } from '../.github/qa-readonly-fetch.mjs';

test('visual QA blocks external writes and telemetry while preserving public reads and local tests', async () => {
  const calls = [];
  const guarded = readOnlyFetch(async (...args) => { calls.push(args); return Response.json({ ok: true }); });
  for (const input of [
    ['https://database.supabase.co/rest/v1/rpc/record_naqada_visit', { method: 'POST' }],
    ['https://database.supabase.co/rest/v1/rpc/record_naqada_sanad_interaction', { method: 'POST' }],
    ['https://database.supabase.co/rest/v1/directory_contributions', { method: 'DELETE' }],
    ['https://database.supabase.co/functions/v1/directory-intake', { method: 'POST' }],
    [new Request('https://database.supabase.co/auth/v1/signup', { method: 'POST' })],
  ]) await assert.rejects(() => guarded(...input), /QA_EXTERNAL_WRITE_BLOCKED/);
  assert.equal(calls.length, 0, 'blocked writes must never reach the network');
  await guarded('https://database.supabase.co/rest/v1/directory_contributors?limit=0');
  await guarded('https://database.supabase.co/rest/v1/rpc/get_public_naqada_content', { method: 'POST', body: '{}' });
  await guarded('http://127.0.0.1:13000/directory_contributions', { method: 'POST' });
  assert.equal(calls.length, 3);
});
