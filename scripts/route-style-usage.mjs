import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import ts from 'typescript';
import postcss from 'postcss';

// Follow render imports, including deferred dialogs, so interaction styles survive.
export function createStyleUsageCollector(root) {
  const descriptions = new Map();
  function describe(file) {
    if (descriptions.has(file)) return descriptions.get(file);
    const source = readFileSync(file, 'utf8');
    const result = { words: new Set(), prefixes: new Set(), modules: new Set(), moduleClasses: new Set(), imports: [] };
    descriptions.set(file, result);
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const hasMarkup = file.endsWith('.tsx') || /className|classNames|clsx|\bcva\(/.test(source);
    const add = value => { for (const word of value.match(/[a-zA-Z_][\w-]*/g) || []) result.words.add(word); };
    function dependency(spec) {
      if (!spec.startsWith('.') && !spec.startsWith('@/')) return;
      const base = spec.startsWith('@/') ? resolve(root, spec.slice(2)) : resolve(dirname(file), spec);
      if (base.endsWith('.module.css') && existsSync(base)) {
        result.modules.add(basename(base, '.module.css'));
        for (const match of readFileSync(base, 'utf8').matchAll(/\.([_a-zA-Z][\w-]*)/g)) result.moduleClasses.add(match[1]);
        return;
      }
      const target = [base, base + '.tsx', base + '.ts', resolve(base, 'index.tsx'), resolve(base, 'index.ts')]
        .find(path => /\.[cm]?[jt]sx?$/.test(path) && existsSync(path));
      if (target) result.imports.push(target);
    }
    function walk(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && !node.importClause?.isTypeOnly && !node.isTypeOnly) dependency(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) dependency(node.arguments[0].text);
      if (hasMarkup && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        !ts.isImportDeclaration(node.parent) && !ts.isExportDeclaration(node.parent) && !/^(?:[./]|https?:)/.test(node.text)) add(node.text);
      if (hasMarkup && ts.isTemplateExpression(node)) {
        add(node.head.text);
        const prefix = node.head.text.match(/([a-zA-Z_][\w-]*)$/)?.[1];
        if (prefix) result.prefixes.add(prefix);
        for (const span of node.templateSpans) add(span.literal.text);
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
    return result;
  }
  return entries => {
    const usage = { words: new Set(['mobile-editorial', 'encyclopedia-ui']), prefixes: new Set(), modules: new Set(), moduleClasses: new Set(), bodyTheme: entries.some(file => resolve(root, file) === resolve(root, 'app/layout.tsx')) };
    const seen = new Set();
    function visit(file) {
      if (seen.has(file) || !existsSync(file)) return;
      seen.add(file);
      const description = describe(file);
      for (const key of ['words', 'prefixes', 'modules', 'moduleClasses']) for (const value of description[key]) usage[key].add(value);
      for (const dependency of description.imports) visit(dependency);
    }
    for (const entry of entries) visit(resolve(root, entry));
    return usage;
  };
}

export function selectorCanMatch(selector, usage) {
  // Unknown escapes stay conservative. Attribute values are not class selectors.
  if (selector.includes('\\')) return true;
  let positive = selector;
  const functional = /:(is|where|has|not)\(/g;
  let match;
  while ((match = functional.exec(positive))) {
    let depth = 1, end = functional.lastIndex;
    for (; end < positive.length && depth; end++) {
      if (positive[end] === '(') depth++;
      else if (positive[end] === ')') depth--;
    }
    if (depth) return true;
    const argumentsText = positive.slice(functional.lastIndex, end - 1);
    if (match[1] !== 'not' && !postcss.list.comma(argumentsText).some(part => selectorCanMatch(part, usage))) return false;
    positive = positive.slice(0, match.index) + positive.slice(end);
    functional.lastIndex = 0;
  }
  let attributesMatch = true;
  positive = positive.replace(/\[([^\]]*)\]/g, (_, attribute) => {
    const classPart = attribute.match(/^class\s*[*^]?=\s*["']([^"']+)["']/);
    if (classPart) {
      const value = classPart[1], moduleName = value.split('-module')[0];
      const present = value.includes('-module') ? [...usage.modules].some(name => name.includes(moduleName))
        : [...usage.words, ...usage.moduleClasses, ...usage.modules].some(name => name.includes(value));
      if (!present) attributesMatch = false;
    }
    return '';
  });
  return attributesMatch && [...positive.matchAll(/\.([a-zA-Z_][\w-]*)/g)]
    .every(([, name]) => usage.words.has(name) || [...usage.prefixes].some(prefix => name.startsWith(prefix)));
}

export function extractRouteStyles(css, usage, sharedUsage) {
  function filter(container) {
    const output = container.clone({ nodes: [] });
    for (const node of container.nodes || []) {
      if (node.type === 'rule') {
        const selectors = postcss.list.comma(node.selector).filter(selector => selectorCanMatch(selector, usage) && (!sharedUsage || !selectorCanMatch(selector, sharedUsage)));
        if (selectors.length) output.append(node.clone({ selector: selectors.join(', ') }));
      } else if (node.type === 'atrule' && /keyframes$/.test(node.name)) {
        if (!sharedUsage) output.append(node.clone());
      } else if (node.nodes) {
        const nested = filter(node);
        if (nested.nodes.length) output.append(nested);
      } else if (!sharedUsage) output.append(node.clone());
    }
    return output;
  }
  const output = filter(postcss.parse(css));
  // Drop earlier declarations only when an identical selector/context replaces
  // them with a broadly supported value. Keep progressive-enhancement fallbacks.
  const stableValue = value => /^(?:#[\da-f]{3,8}|var\(--[\w-]+\)|(?:rgb|rgba|hsl|hsla)\([^()]+\)|(?:-?[\d.]+(?:px|rem|em|%|vh|vw|svh|dvh|ch)?\s*)+)$/i.test(value);
  const replaced = new Map();
  function normalizedSelector(selector) {
    if (!usage.bodyTheme) return { selector, rank: 0 };
    const match = selector.match(/^(body)?((?:\.(?:mobile-editorial|encyclopedia-ui))+)(?:\s+(.+))?$/);
    if (!match) return { selector, rank: 0 };
    return { selector: match[3] || 'body', rank: (match[2].match(/\./g) || []).length * 100 + (match[1] ? 1 : 0) };
  }
  const declarations = [];
  output.walkDecls(declaration => declarations.push(declaration));
  for (const declaration of declarations.toReversed()) {
    if (declaration.parent.type !== 'rule' || declaration.prop.startsWith('--')) continue;
    const contexts = [];
    let safe = true;
    for (let parent = declaration.parent.parent; parent.type !== 'root'; parent = parent.parent) {
      if (parent.type !== 'atrule' || !['media', 'supports', 'container'].includes(parent.name)) { safe = false; break; }
      contexts.push([parent.name, parent.params]);
    }
    if (!safe) continue;
    const selectors = postcss.list.comma(declaration.parent.selector).map(normalizedSelector);
    const key = selector => JSON.stringify([contexts, selector, declaration.prop]);
    const overridden = selectors.every(item => {
      const importantRank = replaced.get(key(item.selector) + ':important');
      return (importantRank !== undefined && (!declaration.important || importantRank >= item.rank)) ||
        (!declaration.important && (replaced.get(key(item.selector) + ':normal') ?? -1) >= item.rank);
    });
    if (overridden) declaration.remove();
    else if (stableValue(declaration.value)) for (const item of selectors) {
      const entry = key(item.selector) + (declaration.important ? ':important' : ':normal');
      replaced.set(entry, Math.max(replaced.get(entry) ?? -1, item.rank));
    }
  }
  output.walkRules(rule => { if (!rule.nodes.length) rule.remove(); });
  output.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  return output.toString();
}
