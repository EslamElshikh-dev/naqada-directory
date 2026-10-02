import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../app/api/admin/activities/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const id = '7cc28ebe-cfd9-463a-b5cb-c1f059d2a020';

function harness({ session = true, moderator = true, reply, failFetch = false } = {}) {
  const exports = {};
  const calls = [];
  const logs = [];
  let sessionCalls = 0;
  const modules = {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/auth/session': {
      resolveSession: async () => { sessionCalls++; return session ? { accessToken: 'private-test-token' } : null; },
      sessionJson: (payload, _session, status = 200) => Response.json(payload, { status }),
    },
    '@/lib/auth/moderator': { canModerate: async () => moderator },
    '@/lib/auth/supabase-rest': {
      SUPABASE_URL: 'https://database.example',
      restHeaders: () => ({ Authorization: 'Bearer private-test-token' }),
      sameOrigin: (request) => !request.headers.get('origin') || request.headers.get('origin') === new URL(request.url).origin,
    },
  };
  vm.runInNewContext(compiled, {
    exports, require: (name) => modules[name],
    console: { error: (...args) => logs.push(args) },
    fetch: async (url, init) => {
      calls.push({ url, ...init });
      if (failFetch) throw Error('upstream unavailable');
      return reply ? reply() : Response.json({ ok: true, id, status: JSON.parse(init.body).p_status, changed: true });
    },
  });
  return {
    calls, logs, get sessionCalls() { return sessionCalls; },
    post: (body, origin = 'https://directory.example') => exports.POST(new Request('https://directory.example/api/admin/activities/', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
    })),
  };
}

for (const status of ['published', 'rejected']) {
  test(`a standard activity UUID reaches the guarded ${status} action`, async () => {
    const h = harness();
    const response = await h.post({ id, status });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].url, 'https://database.example/rest/v1/rpc/review_naqada_owner_listing');
    assert.deepEqual(JSON.parse(h.calls[0].body), { p_id: id, p_status: status });
  });
}

test('malformed IDs and unsupported decisions cannot reach the database', async () => {
  for (const body of [{ id: '7cc28ebe-cfd9-463a-b5cb-1234-c1f059d2a020', status: 'published' }, { id, status: 'pending' }, null]) {
    const h = harness();
    assert.equal((await h.post(body)).status, 400);
    assert.equal(h.calls.length, 0);
  }
});

test('foreign origins and members without moderation permission cannot decide requests', async () => {
  for (const options of [{ session: false }, { moderator: false }]) {
    const h = harness(options);
    assert.equal((await h.post({ id, status: 'published' })).status, 403);
    assert.equal(h.calls.length, 0);
  }
  const h = harness();
  assert.equal((await h.post({ id, status: 'published' }, 'https://other.example')).status, 403);
  assert.equal(h.sessionCalls, 0);
});

test('a competing moderation decision returns a conflict without overwriting it', async () => {
  const h = harness({ reply: () => Response.json({ ok: false, code: 'ALREADY_REVIEWED', status: 'rejected' }) });
  const response = await h.post({ id, status: 'published' });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'ALREADY_REVIEWED');
});

test('database failures produce a useful response and log no token or private payload', async () => {
  for (const options of [
    { failFetch: true },
    { reply: () => Response.json({ code: '42501', message: 'private database details' }, { status: 403 }) },
    { reply: () => new Response('invalid json', { status: 200 }) },
  ]) {
    const h = harness(options);
    const response = await h.post({ id, status: 'published' });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, 'REVIEW_SAVE_FAILED');
    assert.ok(h.logs.length);
    assert.doesNotMatch(JSON.stringify(h.logs), /private-test-token|private database details/);
  }
});
