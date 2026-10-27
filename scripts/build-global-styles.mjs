import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { cleanGlobalStyles } from './global-style-cleanup.mjs';
import { createStyleUsageCollector, extractRouteStyles, retainReferencedVariables } from './route-style-usage.mjs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const writeCss = (file, css) => writeFileSync(file, css.trimEnd() + '\n');

// Preserve the established cascade; CSS Modules stay separate by route.
const sources = [
  "./globals.css",
  "./naqada-theme.css",
  "./member-system.css",
  "./premium-refresh.css",
  "./experience-polish.css",
  "./design-rework.css",
  "./global-search.css",
  "./responsive-mobile.css",
  "./interface-refresh.css",
  "./design-system-v2.css",
  "./detail-experience-v2.css",
  "./discovery-experience-v2.css",
  "./ui-quality-v13.css",
  "./stability-overrides.css",
  "./design-v18.css",
  "./design-v18-responsive.css",
  "./design-v18-directory.css",
  "./design-v19-detail.css",
  "./design-v20-editorial.css",
  "./mobile-editorial.css",
  "./encyclopedia-refresh.css",
  "./usayrat-parity.css",
  "./listing-card-resilience.css",
  "./navigation-refresh.css",
  "./typography.css"
];
const app = new URL('../app/', import.meta.url);
const retiredClasses = new Set(JSON.parse(readFileSync(new URL('./retired-global-classes.json', import.meta.url), 'utf8')));
function readSource(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    return entry.isDirectory() ? readSource(url)
      : /\.[cm]?[jt]sx?$/.test(entry.name) ? [readFileSync(url, 'utf8')] : [];
  });
}
const source = ['app', 'components', 'lib'].flatMap((name) => readSource(new URL('../' + name + '/', import.meta.url))).join('\n');
const sourceWords = new Set(source.match(/[\w-]+/g));
const dynamicPrefixes = [...source.matchAll(/([a-zA-Z_][\w-]*)\$\{/g)].map((match) => match[1]);
for (const className of retiredClasses) {
  if (sourceWords.has(className) || dynamicPrefixes.some((prefix) => className.startsWith(prefix))) {
    throw new Error('Retired global class is used again; restore its styles before building: ' + className);
  }
}
const css = sources.map((name) => {
  const text = readFileSync(new URL(name, app), 'utf8');
  if (/^\s*@import\b/m.test(text)) throw new Error('Nested CSS import requires explicit review: ' + name);
  return '/* Source: ' + name + ' */\n' + text;
}).join('\n\n');
const cleaned = cleanGlobalStyles(css, retiredClasses);
writeCss(new URL('site-styles.css', app), cleaned.css + '\n');
const root = fileURLToPath(new URL('../', import.meta.url));
const collect = createStyleUsageCollector(root);
const sharedEntries = ['app/layout.tsx', 'app/not-found.tsx', 'app/error.tsx'].filter(name => existsSync(new URL('../' + name, import.meta.url)));
const shared = collect(sharedEntries);
// These small primitives are owned by shell-base.css, not the retired redesign layers.
const foundation = readFileSync(new URL('shell-base.css', app), 'utf8');
for (const [, name] of foundation.matchAll(/\.([a-zA-Z_][\w-]*)/g)) shared.words.add(name);
const variables = postcss.parse(extractRouteStyles(cleaned.css, shared));
variables.walkAtRules(rule => { if (/keyframes$/.test(rule.name)) rule.remove(); });
variables.walkDecls(declaration => { if (!declaration.prop.startsWith('--')) declaration.remove(); });
variables.walkRules(rule => { if (!rule.nodes.length) rule.remove(); });
variables.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
const base = readFileSync(new URL('shell-base.css', app), 'utf8') + '\n' + readFileSync(new URL('typography.css', app), 'utf8');
let activeStyles = base + '\n' + source;
// Compatibility sheet for third-party embeds; app routes import their own subset.
writeCss(new URL('content-styles.css', app), extractRouteStyles(cleaned.css, collect(['app/layout.tsx', ...pageFiles(app)]), shared) + '\n');
mkdirSync(new URL('route-styles/', app), { recursive: true });
function pageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    return entry.isDirectory() ? pageFiles(url) : entry.name === 'page.tsx' ? [fileURLToPath(url)] : [];
  });
}
const sizes = {};
for (const file of pageFiles(app)) {
  const relative = file.slice(fileURLToPath(app).length);
  const name = relative === 'page.tsx' ? 'home' : relative.replace(/\/page\.tsx$/, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+$/, '');
  if (sizes[name] !== undefined) throw Error('Duplicate route style name: ' + name);
  const parents = relative.split('/').slice(0, -1).map((_, index, parts) => 'app/' + parts.slice(0, index + 1).join('/') + '/layout.tsx').filter(path => existsSync(new URL('../' + path, import.meta.url)));
  const styles = extractRouteStyles(cleaned.css, collect([...sharedEntries, ...parents, file]), shared);
  writeCss(new URL('route-styles/' + name + '.css', app), styles + '\n');
  activeStyles += '\n' + styles;
  sizes[name] = Buffer.byteLength(styles);
}
writeCss(new URL('not-found-styles.css', app), extractRouteStyles(cleaned.css, collect(['app/global-not-found.tsx'])) + '\n');
const searchStyles = extractRouteStyles(cleaned.css, collect([...sharedEntries, 'components/global-search.tsx']), shared);
writeCss(new URL('route-styles/global-search.css', app), searchStyles + '\n');
activeStyles += '\n' + searchStyles;
function moduleStyles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    return entry.isDirectory() ? moduleStyles(url) : entry.name.endsWith('.module.css') ? [readFileSync(url, 'utf8')] : [];
  });
}
activeStyles += '\n' + ['app', 'components'].flatMap(name => moduleStyles(new URL('../' + name + '/', import.meta.url))).join('\n');
const shell = retainReferencedVariables(variables.toString(), activeStyles) + '\n' + base;
writeCss(new URL('shell-styles.css', app), shell + '\n');
console.log(JSON.stringify({ shellBytes: Buffer.byteLength(shell), routes: sizes, sourceBytes: Buffer.byteLength(css), outputBytes: Buffer.byteLength(cleaned.css), removedSelectors: cleaned.removedSelectors, removedDeclarations: cleaned.removedDeclarations }));
