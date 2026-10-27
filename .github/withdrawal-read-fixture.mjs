import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readOnlyFetch } from './qa-readonly-fetch.mjs';

// Activated only by the isolated withdrawal test's NODE_OPTIONS, never by the app.
const folder = process.env.NAQADA_WITHDRAWAL_FIXTURE;
const id = '11111111-1111-4111-8111-111111111111';
const upstream = readOnlyFetch(globalThis.fetch);
let held = false;
const listing = { id, owner_user_id: id, name: 'نشاط اختبار سحب المحتوى', phone: '+201000000000', hours: 'يوميًا',
  address: 'عنوان اختبار', description: 'بيانات اصطناعية لفحص السحب، لا تمثل نشاطًا حقيقيًا.', category: 'الطب والصحة',
  locality: 'مدينة نقادة', photo_paths: [], cover_path: null, maps_url: null, status: 'published',
  created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' };
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (folder && url.hostname === 'ceyjfguoomdlrtsujskj.supabase.co') {
    const control = JSON.parse(readFileSync(join(folder, 'control.json'), 'utf8'));
    if (method === 'GET' && url.pathname === '/rest/v1/directory_owner_listings') {
      const snapshot = control.hidden ? [] : [listing];
      if (!held && control.hold && url.searchParams.get('id') === 'eq.' + id) {
        held = true; writeFileSync(join(folder, 'started'), '1');
        const deadline = Date.now() + 30000;
        while (!existsSync(join(folder, 'release'))) {
          if (Date.now() > deadline) throw new Error('Withdrawal fixture was not released');
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      }
      return Response.json(snapshot);
    }
    if (method === 'POST' && url.pathname === '/rest/v1/rpc/get_public_naqada_content') {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      return Response.json(body.p_kind === 'business' && control.hiddenSlug
        ? [{ kind: 'business', slug: control.hiddenSlug, origin: 'static', status: 'hidden', payload: {}, updatedAt: '2026-10-27T00:00:00Z' }] : []);
    }
    if (method === 'GET') return Response.json([]);
  }
  return upstream(input, init);
};
