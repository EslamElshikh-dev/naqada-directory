import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import postcss from 'postcss';
import { selectorCanMatch } from './route-style-usage.mjs';

const moduleUsage = names => ({ words: names, prefixes: new Set(), modules: new Set(), moduleClasses: names });

function selectRules(css, accept) {
  function filter(parent) {
    const result = parent.clone({ nodes: [] });
    for (const node of parent.nodes || []) {
      if (node.type === 'rule') {
        const selectors = postcss.list.comma(node.selector).filter(accept);
        if (selectors.length) result.append(node.clone({ selector: selectors.join(', ') }));
      } else if (node.type === 'atrule' && /keyframes$/.test(node.name)) result.append(node.clone());
      else if (node.nodes) { const child = filter(node); if (child.nodes.length) result.append(child); }
    }
    return result;
  }
  return filter(postcss.parse(css)).toString().trimEnd() + '\n';
}

export function buildWidgetStyles(root) {
  const output = new URL('public/styles/widgets/', root);
  mkdirSync(output, { recursive: true });
  let initialCss = '';
  for (const [name, file, eager] of [
    ['sanad', 'sanad-assistant', ['root', 'launcher', 'avatar', 'hint', 'mobileLabel']],
    ['notifications', 'header-notifications', ['root', 'trigger', 'unread', 'decisionToast', 'decisionMark']],
  ]) {
    const css = postcss.parse(readFileSync(new URL('components/' + file + '.module.css', root), 'utf8'));
    const classes = new Set();
    const animations = new Map();
    css.walkAtRules(rule => { if (/keyframes$/.test(rule.name)) {
      const original = rule.params;
      rule.params = 'nq-' + name + '-' + original;
      animations.set(original, rule.params);
    } });
    css.walkRules(rule => { rule.selector = rule.selector.replace(/\.([a-zA-Z_][\w-]*)/g, (_, key) => {
      classes.add(key); return '.nq-' + name + '__' + key;
    }); });
    css.walkDecls(declaration => { if (/^(?:animation|animation-name)$/.test(declaration.prop)) {
      declaration.value = declaration.value.replace(/[a-zA-Z_][\w-]*/g, word => animations.get(word) || word);
    } });
    const critical = new Set(eager.map(key => 'nq-' + name + '__' + key));
    const initial = selector => [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].every(([, key]) => critical.has(key));
    initialCss += selectRules(css.toString(), initial);
    writeFileSync(new URL(name + '.css', output), selectRules(css.toString(), selector => !initial(selector)));
    const names = Object.fromEntries([...classes].sort().map(key => [key, 'nq-' + name + '__' + key]));
    writeFileSync(new URL('components/' + file + '-styles.ts', root), '// Generated from ' + file + '.module.css.\nexport default ' + JSON.stringify(names, null, 2) + ' as const;\n');
  }
  initialCss += ':where(.listing-card){position:relative;min-width:0;overflow:hidden}:where(.listing-card__cover){position:relative;height:180px;overflow:hidden}\n';
  writeFileSync(new URL('app/widget-triggers.css', root), initialCss);

  const feature = readFileSync(new URL('components/role-model-feature.tsx', root), 'utf8');
  const names = new Set([...feature.matchAll(/styles\.([\w]+)/g)].map(match => match[1]));
  const source = readFileSync(new URL('app/role-models/role-models.module.css', root), 'utf8');
  const featureCss = selectRules(source, selector => selectorCanMatch(selector, moduleUsage(names)));
  writeFileSync(new URL('components/role-model-feature.module.css', root), featureCss);

  const village = readFileSync(new URL('app/villages/[slug]/page.tsx', root), 'utf8');
  const knowledgeNames = new Set([...village.matchAll(/knowledgeStyles\.([\w]+)/g)].map(match => match[1]));
  const knowledgeCss = readFileSync(new URL('app/knowledge/knowledge.module.css', root), 'utf8');
  writeFileSync(new URL('app/villages/[slug]/knowledge-summary.module.css', root), selectRules(knowledgeCss, selector => selectorCanMatch(selector, moduleUsage(knowledgeNames))));
}

export function deferGlobalWidgetStyles(css, root) {
  const output = new URL('public/styles/widgets/', root);
  const category = selector => {
    // Shared functional alternatives must stay available before any widget opens.
    if (/:(?:is|where|has|not)\(/.test(selector)) return null;
    const names = [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(match => match[1]);
    if (names.some(name => /^listing-card(?:__|--|$)/.test(name))) return 'cards';
    if (names.some(name => /^global-search__/.test(name) && name !== 'global-search__trigger') && !names.includes('global-search__trigger')) return 'search';
    if (names.some(name => /^(?:site-reviews|reviews-|review-)/.test(name))) return 'reviews';
    return null;
  };
  for (const name of ['search', 'reviews', 'cards']) writeFileSync(new URL(name + '.css', output), selectRules(css, selector => category(selector) === name));
  return selectRules(css, selector => category(selector) === null);
}
