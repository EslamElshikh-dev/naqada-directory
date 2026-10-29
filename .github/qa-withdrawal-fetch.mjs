import { readOnlyFetch } from './qa-readonly-fetch.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const fetcher = readOnlyFetch(globalThis.fetch);
const statePath = process.env.NAQADA_QA_WITHDRAWAL_STATE;
if (!statePath) throw Error('A local withdrawal fixture state path is required');
const startedPath = statePath + '.started';
const row = {
  id: process.env.NAQADA_QA_WITHDRAWAL_ID || '00000000-0000-4000-8000-000000000202', owner_user_id: '00000000-0000-4000-8000-000000000001',
  name: 'اختبار السحب المحلي', phone: '+201000000000', hours: '', address: 'بيئة اختبار محلية',
  description: 'سجل اصطناعي لاختبار اختفاء النشاط بعد السحب، ولا يُرسل إلى قاعدة البيانات.',
  category: 'الخدمات المهنية', locality: 'نقادة', photo_paths: [], status: 'published',
  created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z',
};
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!url.hostname.endsWith('.supabase.co')) return fetcher(input, init);
  if (url.pathname.endsWith('/rpc/get_public_naqada_content')) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    return Response.json(body.p_kind === 'business' && state.hiddenSlug ? [{kind:'business',slug:state.hiddenSlug,origin:'static',status:'hidden',payload:{},updatedAt:'2026-10-29T00:00:00Z'}] : []);
  }
  if (url.pathname !== '/rest/v1/directory_owner_listings') return fetcher(input, init);
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  const rows = state.mode === 'hidden' ? [] : [row];
  if (state.mode === 'hold') {
    writeFileSync(startedPath, '1');
    while (!JSON.parse(readFileSync(statePath, 'utf8')).release) await new Promise(resolve => setTimeout(resolve, 40));
  }
  return Response.json(rows);
};
