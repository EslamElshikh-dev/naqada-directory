import test from 'node:test';
import assert from 'node:assert/strict';
import { selectorCanMatch, extractRouteStyles, createStyleUsageCollector, retainReferencedVariables } from '../scripts/route-style-usage.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const usage = { words: new Set(['page', 'card', 'button']), prefixes: new Set(['tone-']), modules: new Set(['blog']), moduleClasses: new Set(['hero']) };
test('only class expressions drive CSS retention, including local constants and dynamic modifiers', () => {
  const root = mkdtempSync(join(tmpdir(), 'naqada-style-usage-'));
  try {
    mkdirSync(join(root, 'app'));
    writeFileSync(join(root, 'app/layout.tsx'), "const names = { first: 'button', second: 'card' }; const label = 'retired hero'; export default function Page() { return <main aria-label={label} className={'page ' + names.first}><span className={`tone-${value}`} /></main>; }");
    const result = createStyleUsageCollector(root)(['app/layout.tsx']);
    assert.ok(result.words.has('page') && result.words.has('button') && result.words.has('card'));
    assert.ok(result.prefixes.has('tone-'));
    assert.ok(!result.words.has('retired') && !result.words.has('hero'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('alternatives need a complete possible branch; negation and attribute dots are preserved', () => {
  assert.equal(selectorCanMatch('.page :is(.card, .unrelated)', usage), true);
  assert.equal(selectorCanMatch('.page :is(.card .missing, .unrelated)', usage), false);
  assert.equal(selectorCanMatch('.card:not(.unrelated)[title=".unrelated"]', usage), true);
  assert.equal(selectorCanMatch('.tone-health:hover', usage), true);
});
test('module overrides remain on their own route and deferred button interaction rules survive', () => {
  assert.equal(selectorCanMatch('[class*="blog-module"][class*="hero"]', usage), false);
  assert.equal(selectorCanMatch('[class*="hero"]', usage), true);
  assert.equal(selectorCanMatch('[class*="knowledge-module"]', usage), false);
  const css = extractRouteStyles('.card{color:red}.button:focus-visible{outline:2px solid red}.unrelated{color:blue}@media(max-width:700px){.card{padding:8px}}', usage);
  assert.match(css, /focus-visible/); assert.match(css, /@media/); assert.doesNotMatch(css, /unrelated/);
});

test('shell variables retain transitive fallbacks and JavaScript readers without unused themes', () => {
  const css = retainReferencedVariables(':root{--ink:var(--fallback);--fallback:#173a30;--old-clay:#71351f;--reader:12px}@media(max-width:700px){:root{--ink:var(--mobile);--mobile:#264b3e}}', 'body{color:var(--ink)} getPropertyValue("--reader")');
  assert.match(css, /--fallback/); assert.match(css, /--mobile/); assert.match(css, /--reader/);
  assert.doesNotMatch(css, /--old-clay/);
});
test('overridden supported values shrink without deleting fallbacks or crossing media boundaries', () => {
  const css = extractRouteStyles('.card{padding:30px;display:block;display:subgrid}.card{padding:20px}@media(max-width:700px){.card{padding:10px}}', usage);
  assert.doesNotMatch(css, /30px/); assert.match(css, /20px/); assert.match(css, /10px/);
  assert.match(css, /display:block;display:subgrid/);
});

test('known body themes can replace older rules without deleting a more specific winner', () => {
  const themed = { ...usage, words: new Set([...usage.words, 'encyclopedia-ui', 'mobile-editorial']), bodyTheme: true };
  const css = extractRouteStyles('.card{padding:30px}body.encyclopedia-ui .card{padding:20px}.card{padding:10px}', themed);
  assert.doesNotMatch(css, /30px/);
  assert.match(css, /20px/);
  assert.doesNotMatch(css, /10px/);
  const isolated = extractRouteStyles('.card{padding:30px}body.encyclopedia-ui .card{padding:20px}', usage);
  assert.match(isolated, /30px/);
});

test('is and where alternatives retain their CSS specificity while redundant layers disappear', () => {
  const css = extractRouteStyles('.card,.button{padding:10px}:is(.card,.button){padding:20px}.card{padding:30px}.button{padding:40px}', usage);
  assert.doesNotMatch(css, /10px|20px/); assert.match(css, /30px/); assert.match(css, /40px/);
  const fallback = extractRouteStyles('.card{padding:10px}:where(.card){padding:20px}', usage);
  assert.match(fallback, /10px/); assert.doesNotMatch(fallback, /20px/);
});

test('common gradients and borders can replace old decorations while new CSS fallback values remain', () => {
  const css = extractRouteStyles('.card{background:#fff;border:1px solid #aaa;color:rgb(0,0,0);color:color-mix(in srgb,red,blue)}.card{background:linear-gradient(90deg,#eee,#fff);border:2px solid rgba(0,0,0,.1)}', usage);
  assert.doesNotMatch(css, /background:#fff/); assert.doesNotMatch(css, /1px solid #aaa/);
  assert.match(css, /color:rgb\(0,0,0\);color:color-mix/);
});


test('a later override removes only the obsolete member of a grouped selector', () => {
  const usage = { words: new Set(['a', 'b']), prefixes: new Set(), modules: new Set(), moduleClasses: new Set() };
  const css = extractRouteStyles('.a,.b{color:#111;padding:1px}.a{color:#222}.a:hover{padding:2px}', usage);
  assert.match(css, /\.b\{color:#111/);
  assert.doesNotMatch(css, /\.a\{color:#111/);
  assert.match(css, /\.a\{padding:1px/);
  assert.match(css, /\.a:hover\{padding:2px/);
});
