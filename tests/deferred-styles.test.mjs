import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
function declarations(css, transform = value => value) {
  const result = new Set();
  postcss.parse(css).walkRules(rule => {
    if (/keyframes$/.test(rule.parent.name || '')) return;
    const context = [];
    for (let parent = rule.parent; parent.type !== 'root'; parent = parent.parent) context.push([parent.name, parent.params]);
    for (const selector of postcss.list.comma(rule.selector)) {
      result.add(JSON.stringify([context, transform(selector).replace(/\s+/g, ' ').trim(), rule.nodes.map(node => node.toString()).join(';')]));
    }
  });
  return result;
}

test('deferred public widgets preserve all original global rules and their media contexts', () => {
  const source = declarations(read('app/site-styles.css'));
  const remaining = declarations(read('app/shell-styles.css'));
  for (const name of ['search', 'reviews', 'cards']) {
    const sheet = read(`public/styles/widgets/${name}.css`);
    for (const rule of declarations(sheet)) assert.ok(source.has(rule), `Deferred CSS changed a declaration: ${rule}`);
  }
  // Their visual rules are absent from the initial shell; the triggers remain.
  assert.ok([...remaining].every(rule => !/global-search__panel|listing-card__body|review-form-card/.test(rule)));
});

test('widget class conversion keeps panel declarations intact and maps every referenced class', () => {
  for (const [name, file] of [['sanad', 'sanad-assistant'], ['notifications', 'header-notifications']]) {
    let originalCss = read(`components/${file}.module.css`);
    const animations = [...originalCss.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].map(match => match[1]);
    for (const animation of animations) originalCss = originalCss.replace(new RegExp('\\b' + animation + '\\b', 'g'), 'nq-' + name + '-' + animation);
    const original = declarations(originalCss, selector => selector.replace(/\.([a-zA-Z_][\w-]*)/g, '.nq-' + name + '__$1'));
    const transformed = new Set([...declarations(read('app/widget-triggers.css')), ...declarations(read(`public/styles/widgets/${name}.css`))]);
    for (const rule of original) assert.ok(transformed.has(rule), `Missing widget rule: ${rule}`);
    const names = read(`components/${file}-styles.ts`);
    const component = read(`components/${file}.tsx`);
    for (const [, key] of component.matchAll(/styles\.([\w]+)/g)) assert.ok(names.includes('"' + key + '"'), `Missing class mapping: ${key}`);
  }
});
