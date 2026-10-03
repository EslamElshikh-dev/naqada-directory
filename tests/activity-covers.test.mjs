import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import sharp from 'sharp';

function load(path, modules = {}, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(compiled, { exports, require: (name) => modules[name], ...globals });
  return exports;
}
const media = load('../lib/owner-listing-photo.ts');
const maps = load('../lib/activity-map.ts', {}, { URL });
const site = load('../lib/site.ts');
const ownerId = '00000000-0000-4000-8000-000000000001';
const id = '00000000-0000-4000-8000-000000000002';
const photo = (number) => `${ownerId}/${id}/00000000-0000-4000-8000-${String(number).padStart(12, '0')}.jpg`;

test('legacy galleries become covers and an explicit cover keeps all gallery images', () => {
  assert.equal(media.ownerListingCoverPath({ photo_paths: [photo(3), photo(4)] }), photo(3));
  assert.equal(media.ownerListingCoverPath({ cover_path: photo(5), photo_paths: [photo(3), photo(4)] }), photo(5));
  assert.equal(JSON.stringify(media.ownerListingPhotoPaths({ cover_path: photo(4), photo_paths: [photo(3), photo(4)] })), JSON.stringify([photo(4), photo(3)]));
  assert.equal(media.ownerListingCoverPath({ photo_paths: [] }), null);
});

test('activity WhatsApp buttons accept local and international Egyptian mobile numbers', () => {
  for (const phone of ['01095525541', '010 9552 5541', '(010) 9552-5541', '+201095525541', '201095525541', '00201095525541']) {
    assert.equal(site.whatsappUrl(phone), 'https://wa.me/201095525541');
  }
  for (const phone of ['01112345678', '01212345678', '01512345678']) {
    assert.equal(site.whatsappUrl(phone), `https://wa.me/20${phone.slice(1)}`);
  }
  for (const phone of [null, '', '0961234567', '01312345678', '0109552554', 'https://evil.test']) assert.equal(site.whatsappUrl(phone), null);
});

test('map links accept Google Maps only and text-address search is identified honestly', () => {
  for (const url of ['https://maps.app.goo.gl/example', 'https://www.google.com/maps/place/Naqada', 'https://maps.google.com/?q=Naqada']) assert.equal(maps.isActivityMapUrl(url), true);
  for (const url of ['javascript:alert(1)', 'https://maps.app.goo.gl.evil.test/', 'https://evil.test/', 'https://user:pass@google.com/maps', 'https://google.com:8443/maps']) assert.equal(maps.isActivityMapUrl(url), false);
  const result = maps.activityMapLink({ name: 'الماس فون', address: 'شارع السنترال', locality: 'طوخ' });
  assert.equal(result.hasPin, false);
  assert.equal(result.label, 'بحث بالعنوان');
  assert.ok(decodeURIComponent(result.url).includes('الماس فون، شارع السنترال، طوخ'));
});

function harness({ signedIn = true, gallery = [photo(3)], cover = null, conflict = false } = {}) {
  const calls = [];
  let listing = { id, owner_user_id: ownerId, name: 'نشاط تجريبي', photo_paths: gallery, cover_path: cover, updated_at: '2026-10-03T00:00:00+00:00', status: 'published' };
  const route = load('../app/api/owner-listings/[id]/photos/route.ts', {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/auth/session': {
      resolveSession: async () => signedIn ? { user: { id: ownerId }, accessToken: 'test' } : null,
      sessionJson: (body, _session, status = 200) => Response.json(body, { status }),
    },
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://database.example', restHeaders: () => ({}), sameOrigin: (request) => request.headers.get('origin') === 'https://directory.example' },
    '@/lib/owner-listings': { ownerListingSelect: 'id,photo_paths,cover_path,updated_at' }, sharp,
  }, {
    Buffer, File, Uint8Array, String, crypto: { randomUUID },
    fetch: async (url, init) => {
      calls.push({ url, ...init });
      if (url.includes('/rest/v1/')) {
        if (init.method === 'PATCH') {
          if (conflict) return Response.json([]);
          listing = { ...listing, ...JSON.parse(init.body), status: 'pending' };
        }
        return Response.json([listing]);
      }
      return Response.json({}, { status: 200 });
    },
  });
  return { calls, listing: () => listing,
    call: (method, body, origin = 'https://directory.example') => route[method](new Request('https://directory.example/api/owner-listings/' + id + '/photos', {
      method, body: body instanceof FormData ? body : JSON.stringify(body),
      headers: { Origin: origin, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    }), { params: Promise.resolve({ id }) }),
  };
}

async function imageForm(role) {
  const bytes = await sharp({ create: { width: 64, height: 40, channels: 3, background: '#218453' } }).jpeg().toBuffer();
  const form = new FormData(); form.append('photo', new File([bytes], 'cover.jpg', { type: 'image/jpeg' })); form.append('role', role);
  return form;
}

test('a separate optimized cover can be uploaded even with five gallery photos', async () => {
  const gallery = [3,4,5,6,7].map(photo);
  const h = harness({ gallery });
  assert.equal((await h.call('POST', await imageForm('cover'))).status, 201);
  assert.deepEqual(h.listing().photo_paths, gallery);
  assert.ok(h.listing().cover_path.endsWith('.webp'));
  const upload = h.calls.find((call) => call.url.includes('/storage/v1/object/') && call.method === 'POST');
  assert.equal((await sharp(upload.body).metadata()).format, 'webp');
  assert.ok(h.calls.find((call) => call.method === 'PATCH').url.includes('updated_at=eq.'));
});

test('gallery limits still apply without blocking an independent cover', async () => {
  const h = harness({ gallery: [3,4,5,6,7].map(photo) });
  assert.equal((await h.call('POST', await imageForm('gallery'))).status, 400);
  assert.equal(h.calls.some((call) => call.url.includes('/storage/')), false);
});

test('unauthenticated and foreign-origin requests cannot change media', async () => {
  const anonymous = harness({ signedIn: false });
  assert.equal((await anonymous.call('PATCH', { cover_path: photo(3) })).status, 401);
  assert.equal(anonymous.calls.length, 0);
  const foreign = harness();
  assert.equal((await foreign.call('PATCH', { cover_path: photo(3) }, 'https://foreign.example')).status, 403);
  assert.equal(foreign.calls.length, 0);
});

test('owners can select their gallery image and cannot select an unrelated image', async () => {
  const h = harness({ gallery: [photo(3), photo(4)] });
  assert.equal((await h.call('PATCH', { cover_path: photo(4) })).status, 200);
  assert.equal(h.listing().cover_path, photo(4));
  assert.equal((await h.call('PATCH', { cover_path: photo(9) })).status, 400);
  assert.equal(h.listing().cover_path, photo(4));
});

test('deleting the selected gallery image clears its explicit cover and chooses the next photo', async () => {
  const h = harness({ gallery: [photo(3), photo(4)], cover: photo(3) });
  assert.equal((await h.call('DELETE', { path: photo(3) })).status, 200);
  assert.equal(h.listing().cover_path, null);
  assert.equal(media.ownerListingCoverPath(h.listing()), photo(4));
});

test('an upload that loses a concurrent edit cleans its orphan and retains the old cover', async () => {
  const h = harness({ cover: photo(8), conflict: true });
  assert.equal((await h.call('POST', await imageForm('cover'))).status, 409);
  assert.equal(h.listing().cover_path, photo(8));
  const deletes = h.calls.filter((call) => call.method === 'DELETE');
  assert.equal(deletes.length, 1);
  assert.ok(JSON.parse(deletes[0].body).prefixes[0].endsWith('.webp'));
  assert.notEqual(JSON.parse(deletes[0].body).prefixes[0], photo(8));
});
