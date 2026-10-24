import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS };
function load(path, dependencies = {}, globals = {}) {
  const record = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: options,
  }).outputText, { module: record, exports: record.exports, require: name => dependencies[name], URL, Response, AbortSignal, ...globals });
  return record.exports;
}

const sourceParagraphs = [
  'أعلنت الجهات المختصة في محافظة قنا بدء أعمال الصيانة في الطريق المؤدي إلى قرية أسمنت بمركز نقادة، عقب مراجعة مواقع الحفر ومعاينة الطريق بمعرفة الفرق الميدانية.',
  'وأوضحت الجهة أن فرق العمل ستتابع التجهيزات صباح اليوم التالي، وتشمل الأعمال معالجة المناطق المتضررة وتسهيل الحركة للمواطنين طوال فترة التنفيذ.',
  'كما أكدت متابعة الموقف أولًا بأول في نطاق المركز والتنسيق مع الجهات المعنية لتحديث مواعيد المرور حسب تقدم الأعمال، على أن يعلن أي تغيير عبر القنوات الرسمية.',
];
const brief = 'بدأت أعمال إصلاح الطريق بقرية أسمنت التابعة لمركز نقادة في محافظة قنا، بعدما فحصت الفرق الميدانية مواضع الحفر وحددت الأجزاء التي تحتاج إلى معالجة.\n\nوتشمل خطة العمل تهيئة المناطق المتضررة، مع مراعاة استمرار انتقال المواطنين خلال التنفيذ. وتتولى فرق الصيانة متابعة التجهيزات في صباح اليوم التالي.\n\nوتستمر المتابعة بالتنسيق بين الجهات المعنية داخل المركز. وأي تعديلات على مواعيد المرور ستعلن من خلال القنوات الرسمية وفق تقدم العمل.';
const item = { url: 'https://www.youm7.com/story/2026/10/20/fixture/1', title: 'صيانة طريق في أسمنت', description: 'بدء الصيانة بعد المعاينة الميدانية.' };

function harness({ status = 200, content = brief, finishReason = 'stop', token = 'test-gateway-credential', oidc = '', html, failure } = {}) {
  const calls = [];
  const warnings = [];
  const article = load('../lib/news-article.ts');
  const news = load('../lib/news.ts', {
    react: { cache: fn => fn },
    'next/cache': { unstable_cache: fn => fn },
    './news-article': article,
    './site': {}, './news-editorial': {}, './auth/moderator': {},
    './auth/supabase-rest': {}, './public-content-cache': {}, './news-feed-quality': {},
  }, {
    process: { env: { AI_GATEWAY_API_KEY: token, VERCEL_OIDC_TOKEN: oidc } },
    console: { warn: (...args) => warnings.push(args) },
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (url === item.url) return new Response(html ?? `<article>${sourceParagraphs.map(p => `<p>${p}</p>`).join('')}</article>`);
      assert.equal(url, 'https://ai-gateway.vercel.sh/v1/chat/completions');
      if (failure) throw failure;
      return Response.json(status === 200 ? { choices: [{ finish_reason: finishReason, message: { content } }] } : { error: { message: 'private-provider-error-body' } }, { status });
    },
  });
  return { news, calls, warnings };
}

test('news generation uses the replacement with bounded non-reasoning output and existing messages', async () => {
  const { news, calls } = harness();
  assert.equal(await news.getExpandedNewsBody(item), brief);
  assert.equal(calls.length, 2);
  const request = JSON.parse(calls[1].init.body);
  assert.equal(request.model, 'openai/gpt-4.1-mini');
  assert.equal(request.reasoning_effort, undefined);
  assert.equal(request.max_tokens, 1200);
  assert.equal(request.temperature, 0.2);
  assert.equal(request.stream, false);
  assert.deepEqual(request.messages.map(message => message.role), ['system', 'user']);
  assert.ok(request.messages[1].content.includes(sourceParagraphs[0]));
  assert.equal(request.tools, undefined);
  assert.equal(calls[1].init.cache, 'no-store');
});

test('Vercel OIDC remains supported without an API key', async () => {
  const { news, calls } = harness({ token: '', oidc: 'test-oidc-credential' });
  assert.equal(await news.getExpandedNewsBody(item), brief);
  assert.equal(calls[1].init.headers.Authorization, 'Bearer test-oidc-credential');
});

test('original stories, unavailable credentials, and insufficient source material spend no AI tokens', async () => {
  for (const overrides of [{ isOriginal: true }, { editorialBody: 'مقال تحريري جاهز' }]) {
    const { news, calls } = harness();
    assert.equal(await news.getExpandedNewsBody({ ...item, ...overrides }), null);
    assert.equal(calls.length, 0);
  }
  const missing = harness({ token: '' });
  assert.equal(await missing.news.getExpandedNewsBody(item), null);
  assert.equal(missing.calls.length, 0);
  const insufficient = harness({ html: '<article><p>نص غير كافٍ</p></article>' });
  assert.equal(await insufficient.news.getExpandedNewsBody(item), null);
  assert.equal(insufficient.calls.length, 1);
});

test('provider failures preserve the existing source preview without retries or secret logging', async () => {
  for (const status of [400, 401, 402, 403, 404, 429, 503]) {
    const { news, calls, warnings } = harness({ status });
    assert.equal(await news.getExpandedNewsBody(item), null);
    assert.equal(calls.length, 2);
    assert.match(JSON.stringify(warnings), new RegExp(`News summary service returned ${status}`));
    assert.doesNotMatch(JSON.stringify(warnings), /test-gateway-credential|private-provider-error-body/);
  }
  const timeout = harness({ failure: new DOMException('The operation was aborted due to timeout', 'TimeoutError') });
  assert.equal(await timeout.news.getExpandedNewsBody(item), null);
  assert.equal(timeout.calls.length, 2);
});

test('text content blocks are read without exposing reasoning or unsupported blocks', async () => {
  const { news } = harness({ content: [{ type: 'reasoning', text: 'hidden reasoning' }, { type: 'text', text: brief }] });
  assert.equal(await news.getExpandedNewsBody(item), brief);
});

test('empty, short, refused, and copied model responses retain the source preview', async () => {
  for (const content of [null, '', 'تفاصيل قصيرة', 'لا أستطيع '.repeat(50), sourceParagraphs.join(' ')]) {
    const { news } = harness({ content });
    assert.equal(await news.getExpandedNewsBody(item), null);
  }
});

test('truncated, filtered, and unfinished responses retain the source preview', async () => {
  for (const finishReason of ['length', 'content_filter', 'tool_calls', null, undefined]) {
    const { news, calls } = harness({ finishReason: finishReason ?? null });
    assert.equal(await news.getExpandedNewsBody(item), null);
    assert.equal(calls.length, 2);
  }
});
