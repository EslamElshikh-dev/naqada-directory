import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}, extras = {}) {
  const record = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, { module: record, exports: record.exports, require: (name) => dependencies[name], URL, Response, ...extras });
  return record.exports;
}

test('phone-only corrections propose a public number without copying private contact or prose', () => {
  const { proposedContributionPhone } = load('../lib/contribution-phone.ts');
  assert.equal(proposedContributionPhone('correction', '01142605995'), '01142605995');
  assert.equal(proposedContributionPhone('correction', '٠١١٤٢٦٠٥٩٩٥'), '01142605995');
  assert.equal(proposedContributionPhone('correction', '+20 (114) 260-5995'), '+201142605995');
  assert.equal(proposedContributionPhone('correction', 'الرقم في النص 01142605995'), null);
  assert.equal(proposedContributionPhone('add', '01142605995'), null);
  assert.equal(proposedContributionPhone('correction', '01142605995 01012345678'), null);
});

test('incoming newer offers cannot displace the reserved seeker headlines', () => {
  const { buildJobHeadlines, MAX_JOB_HEADLINES } = load('../lib/job-headlines.ts');
  const offers = Array.from({ length: 12 }, (_, i) => ({ id: `offer-${i}`, title: 'وظيفة', kind: 'offer', governorate: 'قنا', locality: 'مدينة نقادة', published_at: `2026-10-${String(20 - i).padStart(2, '0')}T10:00:00Z` }));
  const seeker = { id: 'seeker', title: 'خالد حسان', kind: 'seeker', field: 'سواق وفني ري', locality: 'حاجر دنفيق', published_at: '2026-10-01T10:00:00Z' };
  const items = buildJobHeadlines([...offers, seeker], new Set(['مدينة نقادة']));
  assert.ok(items.length <= MAX_JOB_HEADLINES);
  const headline = items.find((item) => item.href === '/jobs#job-seeker');
  assert.ok(headline);
  assert.equal(headline.tag, 'باحث عن عمل');
  assert.match(headline.text, /خالد حسان.*سواق وفني ري.*حاجر دنفيق/);
});

test('confirmation resend validates origin and email and calls the existing signup flow', async () => {
  const calls = [];
  class AuthError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
  let failure = null;
  const route = load('../app/api/auth/resend/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/auth/supabase-rest': { sameOrigin: (r) => r.headers.get('origin') === 'https://naqada-directory.vercel.app', SupabaseAuthError: AuthError,
      resendConfirmation: async (...args) => { if (failure) throw failure; calls.push(args); } },
    '@/lib/site': { siteConfig: { url: 'https://naqada-directory.vercel.app' } },
  });
  const request = (email, origin = 'https://naqada-directory.vercel.app') => new Request('https://naqada-directory.vercel.app/api/auth/resend', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
  assert.equal((await route.POST(request('member@example.com', 'https://other.example'))).status, 403);
  assert.equal((await route.POST(request('bad'))).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await route.POST(request(' Member@Example.com '))).status, 200);
  assert.equal(calls[0][0], 'member@example.com');
  assert.equal(calls[0][1], 'https://naqada-directory.vercel.app/account/login?confirmed=1');
  failure = new AuthError(429, 'over_email_send_rate_limit');
  assert.equal((await route.POST(request('member@example.com'))).status, 429);
});
