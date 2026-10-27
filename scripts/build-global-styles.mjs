import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { cleanGlobalStyles } from './global-style-cleanup.mjs';
import { createStyleUsageCollector, extractRouteStyles } from './route-style-usage.mjs';
import { fileURLToPath } from 'node:url';
import { buildWidgetStyles, deferGlobalWidgetStyles } from './deferred-widget-styles.mjs';

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
writeFileSync(new URL('site-styles.css', app), cleaned.css + '\n');
const project = new URL('../', import.meta.url);
buildWidgetStyles(project);
const eagerCss = deferGlobalWidgetStyles(cleaned.css, project);
const root = fileURLToPath(new URL('../', import.meta.url));
const collect = createStyleUsageCollector(root);
const sharedEntries = ['app/layout.tsx', 'app/not-found.tsx', 'app/error.tsx'].filter(name => existsSync(new URL('../' + name, import.meta.url)));
const shared = collect(sharedEntries);
const shell = extractRouteStyles(eagerCss, shared);
writeFileSync(new URL('shell-styles.css', app), shell.trimEnd() + '\n');
// Compatibility sheet for third-party embeds; app routes import their own subset.
writeFileSync(new URL('content-styles.css', app), extractRouteStyles(cleaned.css, collect(['app/layout.tsx', ...pageFiles(app)]), shared) + '\n');
mkdirSync(new URL('route-styles/', app), { recursive: true });
const staleSheets = new Set(readdirSync(new URL('route-styles/', app)).filter(name => name.endsWith('.css')));
function pageFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    return entry.isDirectory() ? entry.name.startsWith('qa-') ? [] : pageFiles(url) : entry.name === 'page.tsx' ? [fileURLToPath(url)] : [];
  });
}
const sizes = {};
for (const file of pageFiles(app)) {
  const relative = file.slice(fileURLToPath(app).length);
  const name = relative === 'page.tsx' ? 'home' : relative.replace(/\/page\.tsx$/, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+$/, '');
  if (sizes[name] !== undefined) throw Error('Duplicate route style name: ' + name);
  const parents = relative.split('/').slice(0, -1).map((_, index, parts) => 'app/' + parts.slice(0, index + 1).join('/') + '/layout.tsx').filter(path => existsSync(new URL('../' + path, import.meta.url)));
  const styles = extractRouteStyles(eagerCss, collect([...sharedEntries, ...parents, file]), shared);
  writeFileSync(new URL('route-styles/' + name + '.css', app), styles.trimEnd() + (styles.trim() ? '\n' : ''));
  staleSheets.delete(name + '.css');
  sizes[name] = Buffer.byteLength(styles);
}
for (const name of staleSheets) unlinkSync(new URL('route-styles/' + name, app));
writeFileSync(new URL('not-found-styles.css', app), extractRouteStyles(cleaned.css, collect(['app/global-not-found.tsx'])).trimEnd() + '\n');
console.log(JSON.stringify({ shellBytes: Buffer.byteLength(shell), routes: sizes, sourceBytes: Buffer.byteLength(css), outputBytes: Buffer.byteLength(cleaned.css), removedSelectors: cleaned.removedSelectors, removedDeclarations: cleaned.removedDeclarations }));
