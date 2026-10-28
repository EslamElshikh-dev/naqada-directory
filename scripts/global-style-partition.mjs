import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import ts from 'typescript';
import postcss from 'postcss';

export function partitionGlobalStyles(css, root) {
  const seen = new Set();
  const words = new Set(['mobile-editorial', 'encyclopedia-ui']);
  const dynamicPrefixes = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const add = value => { for (const word of value.match(/[a-zA-Z_][\w-]*/g) || []) words.add(word); };
    function collect(node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        !ts.isImportDeclaration(node.parent) && !ts.isExportDeclaration(node.parent) &&
        !/^(?:[./]|https?:)/.test(node.text)) add(node.text);
      if (ts.isTemplateExpression(node)) {
        add(node.head.text);
        const prefix = node.head.text.match(/([a-zA-Z_][\w-]*)$/)?.[1];
        if (prefix) dynamicPrefixes.add(prefix);
        for (const span of node.templateSpans) add(span.literal.text);
      }
      ts.forEachChild(node, collect);
    }
    collect(ast);
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve } }).outputText;
    for (const match of compiled.matchAll(/(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g)) {
      const spec = match[1];
      if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
      const base = spec.startsWith('@/') ? resolve(root, spec.slice(2)) : resolve(dirname(file), spec);
      if (extname(base) && !/\.[cm]?[jt]sx?$/.test(base)) continue;
      const target = [base, base + '.tsx', base + '.ts', resolve(base, 'index.tsx'), resolve(base, 'index.ts')].find(p => existsSync(p) && /\.[cm]?[jt]sx?$/.test(p));
      if (target) visit(target);
    }
  }
  visit(resolve(root, 'app/layout.tsx'));
  visit(resolve(root, 'app/page.tsx'));
  const allowed = name => words.has(name) || [...dynamicPrefixes].some(prefix => name.startsWith(prefix));
  const ast = postcss.parse(css);
  function filter(container, shell) {
    const output = container.clone({ nodes: [] });
    for (const node of container.nodes || []) {
      if (node.type === 'rule') {
        const selectors = postcss.list.comma(node.selector).filter(selector => {
          const positive = selector.replace(/:not\([^)]*\)/g, '');
          const classes = [...positive.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(match => match[1]);
          const oldModule = /\[class[^\]]*['"][^'"]*-module[^'"]*['"]\]/.test(positive);
          const core = !oldModule && (/:(?:is|where|has)\(/.test(positive) ? classes.some(allowed) || !classes.length : classes.every(allowed));
          return core === shell;
        });
        if (selectors.length) output.append(node.clone({ selector: selectors.join(', ') }));
      } else if (node.type === 'atrule' && /keyframes$/.test(node.name)) {
        if (shell) output.append(node.clone());
      } else if (node.nodes) {
        const nested = filter(node, shell);
        if (nested.nodes.length) output.append(nested);
      } else if (shell) output.append(node.clone());
    }
    return output;
  }
  return { shell: filter(ast, true).toString(), content: filter(ast, false).toString() };
}
