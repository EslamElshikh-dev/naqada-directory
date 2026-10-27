import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStyleUsageCollector, extractRouteStyles, selectorCanMatch } from '../scripts/route-style-usage.mjs';

test('route CSS preserves deferred dialogs and dynamic classes without importing another route', () => {
  const root = mkdtempSync(join(tmpdir(), 'naqada-styles-'));
  try {
    mkdirSync(join(root, 'app'));
    writeFileSync(join(root, 'app/page.tsx'), 'const Dialog = dynamic(() => import("./dialog")); export default () => <main className="reading"><Dialog /></main>;');
    writeFileSync(join(root, 'app/dialog.tsx'), 'import styles from "./dialog.module.css"; export default ({ tone }) => <div className={`dialog tone-${tone} ${styles.panel}`} />;');
    writeFileSync(join(root, 'app/dialog.module.css'), '.panel { color: green }');
    const usage = createStyleUsageCollector(root)(['app/page.tsx']);
    const css = extractRouteStyles('.reading,.admin-only{margin:0}.dialog{display:grid}.tone-dark{color:#fff}[class*="dialog-module"]{padding:1px}', usage);
    assert.match(css, /\.reading/);
    assert.match(css, /\.dialog/);
    assert.match(css, /\.tone-dark/);
    assert.match(css, /dialog-module/);
    assert.doesNotMatch(css, /admin-only/);
  } finally { rmSync(root, { recursive: true }); }
});

test('selector filtering keeps negation, attributes and live alternatives in functional selectors', () => {
  const usage = { words: new Set(['reading', 'active']), prefixes: new Set(), modules: new Set(), moduleClasses: new Set() };
  for (const selector of ['.reading:not(.admin)', ':is(.reading,.admin)', '.reading:has(.active)', '[title=".admin"]']) {
    assert.ok(selectorCanMatch(selector, usage), selector);
  }
  for (const selector of ['.admin', '.reading .admin', '.reading:has(.admin)']) assert.ok(!selectorCanMatch(selector, usage), selector);
});

test('route declaration reduction preserves media queries, importance and browser fallbacks', () => {
  const usage = { words: new Set(['reading']), prefixes: new Set(), modules: new Set(), moduleClasses: new Set() };
  const css = extractRouteStyles('.reading{margin:1px;color:#111;display:block;display:subgrid}.reading{color:#222}@media(max-width:600px){.reading{color:#333}}.reading{margin:2px!important}.reading{margin:3px}', usage);
  assert.match(css, /color:#222/);
  assert.match(css, /color:#333/);
  assert.match(css, /display:block;display:subgrid/);
  assert.match(css, /margin:2px!important/);
  assert.doesNotMatch(css, /color:#111|margin:1px/);
});

test('a later override removes only the obsolete member of a grouped selector', () => {
  const usage = { words: new Set(['a', 'b']), prefixes: new Set(), modules: new Set(), moduleClasses: new Set() };
  const css = extractRouteStyles('.a,.b{color:#111;padding:1px}.a{color:#222}.a:hover{padding:2px}', usage);
  assert.match(css, /\.b\{color:#111/);
  assert.doesNotMatch(css, /\.a\{color:#111/);
  assert.match(css, /\.a\{padding:1px/);
  assert.match(css, /\.a:hover\{padding:2px/);
});
