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
    const add = value => { for (const word of value.match(/[a-zA-Z_][\w-]*/g) || []) result.words.add(word); };
    const variables = new Map(), moduleAliases = new Set();
    function bindings(node) {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const name = ts.isIdentifier(node.name) ? node.name : ts.isArrayBindingPattern(node.name) ? node.name.elements[0]?.name : null;
        if (name && ts.isIdentifier(name)) variables.set(name.text, [...(variables.get(name.text) || []), node.initializer]);
      }
      if (ts.isFunctionDeclaration(node) && node.name && node.body) variables.set(node.name.text, [node.body]);
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text.endsWith('.module.css') && node.importClause?.name) moduleAliases.add(node.importClause.name.text);
      ts.forEachChild(node, bindings);
    }
    bindings(ast);
    function classValue(node, seen = new Set()) {
      if (!node || seen.has(node)) return;
      seen.add(node);
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) { add(node.text); return; }
      if (ts.isIdentifier(node)) {
        if (!moduleAliases.has(node.text)) for (const initializer of variables.get(node.text) || []) classValue(initializer, seen);
        return;
      }
      if (ts.isConditionalExpression(node)) { classValue(node.whenTrue, seen); classValue(node.whenFalse, seen); return; }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) { classValue(node.right, seen); return; }
      if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)) return;
      if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && ts.isIdentifier(node.expression) && moduleAliases.has(node.expression.text)) return;
      if (ts.isTemplateExpression(node)) {
        const part = (text, interpolated) => {
          add(text);
          const prefix = interpolated && text.match(/([a-zA-Z_][\w-]*)$/)?.[1];
          if (prefix) result.prefixes.add(prefix);
        };
        part(node.head.text, true);
        node.templateSpans.forEach((span, index) => { classValue(span.expression, seen); part(span.literal.text, index < node.templateSpans.length - 1); });
        return;
      }
      ts.forEachChild(node, child => classValue(child, seen));
    }
    function dependency(spec, deferred = false) {
      if (!spec.startsWith('.') && !spec.startsWith('@/')) return;
      const base = spec.startsWith('@/') ? resolve(root, spec.slice(2)) : resolve(dirname(file), spec);
      if (base.endsWith('.module.css') && existsSync(base)) {
        result.modules.add(basename(base, '.module.css'));
        for (const match of readFileSync(base, 'utf8').matchAll(/\.([_a-zA-Z][\w-]*)/g)) result.moduleClasses.add(match[1]);
        return;
      }
      const target = [base, base + '.tsx', base + '.ts', resolve(base, 'index.tsx'), resolve(base, 'index.ts')]
        .find(path => /\.[cm]?[jt]sx?$/.test(path) && existsSync(path));
      // A deferred widget owns its generated stylesheet; the shell needs only its trigger.
      if (target && !(deferred && readFileSync(target, 'utf8').includes("'@/app/route-styles/"))) result.imports.push(target);
    }
    function walk(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && !node.importClause?.isTypeOnly && !node.isTypeOnly) dependency(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) dependency(node.arguments[0].text, true);
      if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'className') classValue(node.initializer);
      if (ts.isPropertyAssignment(node) && node.name.getText(ast).replace(/["']/g, '') === 'className') classValue(node.initializer);
      if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'className') classValue(node.right);
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /class/i.test(node.name.text)) classValue(node.initializer);
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(ast);
        if (/\.classList\.(?:add|remove|toggle|replace)$/.test(callee) || /^(?:clsx|cn|classNames|cva)$/.test(callee)) node.arguments.forEach(argument => classValue(argument));
        if (/\.setAttribute$/.test(callee) && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'class') classValue(node.arguments[1]);
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
      const value = classPart[1];
      // File names are not DOM classes. Only literal classes and local module
      // class names can satisfy these old substring hooks in the Turbopack build.
      const present = [...usage.words, ...usage.moduleClasses].some(name => name.includes(value));
      if (!present) attributesMatch = false;
    }
    return '';
  });
  return attributesMatch && [...positive.matchAll(/\.([a-zA-Z_][\w-]*)/g)]
    .every(([, name]) => usage.words.has(name) || [...usage.prefixes].some(prefix => name.startsWith(prefix)));
}

export function retainReferencedVariables(css, activeText) {
  const root = postcss.parse(css), definitions = new Map();
  root.walkDecls(declaration => {
    if (declaration.prop.startsWith('--')) definitions.set(declaration.prop, [...(definitions.get(declaration.prop) || []), declaration.value]);
  });
  const references = text => [...text.matchAll(/var\(\s*(--[\w-]+)|['"](--[\w-]+)['"]/g)].map(match => match[1] || match[2]);
  const needed = new Set(references(activeText));
  const pending = [...needed];
  while (pending.length) for (const value of definitions.get(pending.pop()) || []) for (const name of references(value)) {
    if (!needed.has(name)) { needed.add(name); pending.push(name); }
  }
  root.walkComments(comment => comment.remove());
  root.walkDecls(declaration => { if (!needed.has(declaration.prop)) declaration.remove(); });
  root.walkRules(rule => { if (!rule.nodes.length) rule.remove(); });
  root.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  return root.toString();
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
  // Preserve overrides for individual members of grouped selectors.
  const groupedRules = [];
  output.walkRules(rule => groupedRules.push(rule));
  for (const rule of groupedRules) {
    const selectors = postcss.list.comma(rule.selector);
    if (selectors.length < 2 || /keyframes$/.test(rule.parent.name || '')) continue;
    for (const selector of selectors) rule.parent.insertBefore(rule, rule.clone({ selector }));
    rule.remove();
  }
  // Remove declarations dominated by a supported value at an equivalent match.
  // Keep conditional contexts, specificity, importance and future CSS fallbacks.
  const supportedFunctions = new Set(['var', 'calc', 'clamp', 'min', 'max', 'rgb', 'rgba', 'hsl', 'hsla', 'linear-gradient', 'radial-gradient', 'repeat', 'minmax', 'translate', 'translateX', 'translateY', 'translate3d', 'scale', 'scaleX', 'scaleY', 'rotate', 'cubic-bezier', 'url']);
  const supportedKeywords = new Set(('auto none normal inherit initial unset transparent white black red green blue solid dashed dotted double hidden visible collapse block inline inline-block flex inline-flex grid inline-grid flow-root contents table table-cell table-row relative absolute fixed sticky static row row-reverse column column-reverse wrap nowrap wrap-reverse center start end left right top bottom stretch baseline space-between space-around space-evenly border-box content-box border-box border-radius padding-box cover contain repeat no-repeat round ease ease-in ease-out ease-in-out linear both forwards backwards running paused infinite break-word anywhere uppercase lowercase capitalize underline line-through pointer default ellipsis clip scroll fit-content max-content min-content isolate isolate-override horizontal-tb vertical-rl vertical-lr rtl ltr bold bolder lighter serif sans-serif monospace balance pretty').split(' '));
  const stableValue = value => {
    const functions = [...value.matchAll(/([a-zA-Z-]+)\(/g)].map(match => match[1]);
    if (functions.some(name => !supportedFunctions.has(name))) return false;
    const words = value.replace(/url\([^)]*\)/g, '').replace(/--[\w-]+/g, '').replace(/["'][^"']*["']/g, '')
      .replace(/#[\da-f]{3,8}\b/gi, '').replace(/(?:\d*\.)?\d+(?:px|rem|em|%|vh|vw|svh|dvh|ch|fr|deg|ms|s)?/g, '')
      .replace(/[a-zA-Z-]+\(/g, '(').match(/[a-zA-Z][\w-]*/g) || [];
    return words.every(word => supportedKeywords.has(word));
  };
  function bodySelector(selector, rank = 0) {
    if (!usage.bodyTheme) return { selector, rank };
    const match = selector.match(/^(body)?((?:\.(?:mobile-editorial|encyclopedia-ui))+)(?:\s+(.+))?$/);
    if (!match) return { selector, rank };
    return { selector: match[3] || 'body', rank: rank + (match[2].match(/\./g) || []).length * 100 + (match[1] ? 1 : 0) };
  }
  const simple = /^(?:[a-zA-Z][\w-]*|\*)?(?:[.#][\w-]+|:[\w-]+)*$/;
  const specificity = selector => (selector.match(/#/g) || []).length * 10000 +
    ((selector.match(/\./g) || []).length + (selector.match(/:/g) || []).length) * 100 + (/^[a-zA-Z]/.test(selector) ? 1 : 0);
  function equivalentSelectors(selector, rank = 0, depth = 0) {
    if (depth > 5 || /[\[\\]/.test(selector)) return [bodySelector(selector, rank)];
    for (const match of selector.matchAll(/:(is|where)\(([^()]*)\)/g)) {
      const prefix = selector.slice(0, match.index);
      if ((prefix.match(/\(/g) || []).length !== (prefix.match(/\)/g) || []).length) continue;
      const alternatives = postcss.list.comma(match[2]);
      if (!alternatives.length || alternatives.some(part => !part || !simple.test(part))) continue;
      const maximum = match[1] === 'where' ? 0 : Math.max(...alternatives.map(specificity));
      return alternatives.flatMap(part => equivalentSelectors(prefix + part + selector.slice(match.index + match[0].length), rank + maximum - specificity(part), depth + 1));
    }
    return [bodySelector(selector, rank)];
  }
  const records = [], winners = new Map();
  const declarations = [];
  output.walkDecls(declaration => declarations.push(declaration));
  const outranks = (a, b) => a.important !== b.important ? a.important : a.rank !== b.rank ? a.rank > b.rank : a.order > b.order;
  for (const [order, declaration] of declarations.entries()) {
    if (declaration.parent.type !== 'rule') continue;
    const contexts = [];
    let safe = true;
    for (let parent = declaration.parent.parent; parent.type !== 'root'; parent = parent.parent) {
      if (parent.type !== 'atrule' || !['media', 'supports', 'container'].includes(parent.name)) { safe = false; break; }
      contexts.push([parent.name, parent.params]);
    }
    if (!safe) continue;
    const selectors = postcss.list.comma(declaration.parent.selector).flatMap(selector => equivalentSelectors(selector));
    const key = selector => JSON.stringify([contexts, selector, declaration.prop]);
    const matches = selectors.map(item => ({ ...item, key: key(item.selector), declaration, important: Boolean(declaration.important), order }));
    records.push({ declaration, matches });
    if (declaration.prop.startsWith('--') || stableValue(declaration.value)) for (const item of matches) {
      const winner = winners.get(item.key);
      if (!winner || outranks(item, winner)) winners.set(item.key, item);
    }
  }
  for (const { declaration, matches } of records) if (matches.every(item => {
    const winner = winners.get(item.key);
    return winner && winner.declaration !== declaration && outranks(winner, item);
  })) declaration.remove();
  output.walkRules(rule => { if (!rule.nodes.length) rule.remove(); });
  output.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  // Recombine adjacent identical blocks without moving cascade order.
  const containers = [output];
  output.walkAtRules(rule => { if (rule.nodes) containers.push(rule); });
  for (const container of containers) {
    let previous;
    for (const rule of [...container.nodes]) {
      if (rule.type !== 'rule') { previous = undefined; continue; }
      const body = rule.nodes.map(node => node.toString()).join(';');
      if (previous && previous.body === body) {
        previous.rule.selector += ', ' + rule.selector;
        rule.remove();
      } else previous = { rule, body };
    }
  }
  return output.toString();
}
