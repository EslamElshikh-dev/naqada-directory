import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { cleanGlobalStyles } from './global-style-cleanup.mjs';

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
console.log(JSON.stringify({ sourceBytes: Buffer.byteLength(css), outputBytes: Buffer.byteLength(cleaned.css), removedSelectors: cleaned.removedSelectors, removedDeclarations: cleaned.removedDeclarations }));
