import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import sharp from 'sharp';

function load(path, modules = {}, globals = {}) {
  const record = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module: record, exports: record.exports, require: name => modules[name],
    URL, URLSearchParams, Uint8Array, AbortSignal, Response, Buffer, Error, ...globals });
  return record.exports;
}

const delivery = load('../lib/owner-photo-delivery.ts');
const path = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003.jpg'];
const source = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#20634a' } }).jpeg({ quality: 95 }).toBuffer();

function harness({ token, upstream, bytes = source } = {}) {
  const requests = [];
  let sessions = 0;
  const route = load('../app/api/owner-photos/[...path]/route.ts', {
    'next/server': { NextResponse: Response }, sharp,
    '@/lib/owner-photo-delivery': delivery,
    '@/lib/auth/session': { resolveSession: async refresh => { assert.equal(refresh, false); sessions++; return token ? { accessToken: token } : null; } },
    '@/lib/auth/supabase-rest': { SUPABASE_URL: 'https://storage.example', restHeaders: access => ({ Authorization: `Bearer ${access || 'public'}` }) },
  }, { fetch: async (url, init) => {
    requests.push({ url, ...init });
    return upstream ? upstream() : new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } });
  } });
  return { requests, sessions: () => sessions,
    get: (query = '', pieces = path) => route.GET(new Request(`https://directory.example/api/owner-photos/${pieces.join('/')}${query}`), { params: Promise.resolve({ path: pieces }) }),
  };
}

test('responsive delivery bounds every browser size and preserves the original link', () => {
  const src = `/api/owner-photos/${path.join('/')}`;
  assert.equal(delivery.ownerPhotoLoader({ src, width: 320 }), `${src}?w=384`);
  assert.equal(delivery.ownerPhotoLoader({ src, width: 3840 }), `${src}?w=1800`);
  assert.equal(delivery.ownerPhotoLoader({ src: `${src}?w=640&dpl=preview`, width: 960 }), `${src}?w=960&dpl=preview`);
  assert.equal(delivery.ownerPhotoWidth(null), undefined);
});

test('old JPEGs become smaller WebP previews while keeping aspect ratio and private access', async () => {
  const h = harness();
  const response = await h.get('?w=640');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.match(response.headers.get('cache-control'), /^private/);
  assert.equal(response.headers.get('vary'), 'Cookie');
  const preview = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(preview).metadata();
  assert.equal(metadata.width, 640);
  assert.equal(metadata.height, 480);
  assert.ok(preview.length < source.length / 3);
  assert.equal(h.requests[0].headers.Authorization, 'Bearer public');
  assert.ok(h.requests[0].signal instanceof AbortSignal);
});

test('full-size links return original bytes and owner previews use the current session', async () => {
  const h = harness({ token: 'owner-test-token' });
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), source);
  assert.equal(h.requests[0].headers.Authorization, 'Bearer owner-test-token');
});

test('unknown sizes, repeated parameters and invalid paths are rejected before any lookup', async () => {
  for (const query of ['?w=99999', '?w=-1', '?w=0', '?w=640&w=960', '?w=640.0']) {
    const h = harness();
    assert.equal((await h.get(query)).status, 400);
    assert.equal(h.requests.length, 0);
    assert.equal(h.sessions(), 0);
  }
  const h = harness();
  assert.equal((await h.get('?w=640', ['..', ...path.slice(1)])).status, 404);
  assert.equal(h.requests.length, 0);
});

test('storage denial and disguised SVGs cannot be transformed or exposed as previews', async () => {
  const denied = harness({ upstream: () => new Response(null, { status: 403 }) });
  assert.equal((await denied.get('?w=640')).status, 404);
  const svg = harness({ bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>') });
  assert.equal((await svg.get('?w=640')).status, 415);
  const type = harness({ upstream: () => new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }) });
  assert.equal((await type.get('?w=640')).status, 415);
});

test('oversized photo bodies are bounded even without a Content-Length header', async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array(delivery.MAX_OWNER_PHOTO_BYTES));
    controller.enqueue(new Uint8Array(1));
  }, cancel() { cancelled = true; } });
  await assert.rejects(delivery.boundedPhotoBytes(new Response(body)), /PHOTO_TOO_LARGE/);
  assert.equal(cancelled, true);
  const h = harness({ upstream: () => new Response(source, { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(delivery.MAX_OWNER_PHOTO_BYTES + 1) } }) });
  assert.equal((await h.get('?w=640')).status, 413);
});
