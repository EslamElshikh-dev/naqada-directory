import { readFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const layoutPath = resolve(root, 'app/layout.tsx');
const layout = readFileSync(layoutPath, 'utf8');

const cssImports = [...layout.matchAll(/import\s+['"](\.\/[^'"]+\.css)['"];?/g)]
  .map((match) => resolve(dirname(layoutPath), match[1]));

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === '\\') { i += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function declarationsFrom(body) {
  const declarations = [];
  let token = '';
  let quote = null;
  let parenDepth = 0;
  const flush = () => {
    const line = token.trim();
    token = '';
    if (!line) return;
    const colon = line.indexOf(':');
    if (colon <= 0) return;
    const property = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (property && value) declarations.push([property, value]);
  };

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quote) {
      token += char;
      if (char === '\\' && i + 1 < body.length) { token += body[++i]; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; token += char; continue; }
    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === ';' && parenDepth === 0) flush();
    else token += char;
  }
  flush();
  return declarations;
}

const occurrences = [];
let order = 0;

function parseBlocks(source, file, context = 'root') {
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf('{', cursor);
    if (open === -1) break;
    const prelude = source.slice(cursor, open).trim();
    const close = findMatchingBrace(source, open);
    if (close === -1) break;
    const body = source.slice(open + 1, close);
    cursor = close + 1;
    if (!prelude) continue;

    if (/^@(media|supports|container|layer)\b/i.test(prelude)) {
      parseBlocks(body, file, `${context} > ${prelude.replace(/\s+/g, ' ')}`);
      continue;
    }
    if (/^@(keyframes|-webkit-keyframes|font-face|property|page)\b/i.test(prelude)) continue;
    if (prelude.startsWith('@')) continue;

    const declarations = declarationsFrom(body);
    if (!declarations.length) continue;
    const selectors = prelude.split(',').map((selector) => selector.trim()).filter(Boolean);
    for (const selector of selectors) {
      occurrences.push({ selector, context, file: basename(file), order: order++, declarations });
    }
  }
}

for (const file of cssImports) {
  parseBlocks(stripComments(readFileSync(file, 'utf8')), file);
}

const groups = new Map();
for (const occurrence of occurrences) {
  const key = `${occurrence.context}\u0000${occurrence.selector}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(occurrence);
}

const duplicates = [];
const conflicts = [];
for (const group of groups.values()) {
  if (group.length < 2) continue;
  duplicates.push({
    selector: group[0].selector,
    context: group[0].context,
    occurrences: group.map(({ file, order }) => ({ file, order })),
  });

  const valuesByProperty = new Map();
  for (const occurrence of group) {
    for (const [property, value] of occurrence.declarations) {
      if (!valuesByProperty.has(property)) valuesByProperty.set(property, []);
      valuesByProperty.get(property).push({ value, file: occurrence.file, order: occurrence.order });
    }
  }
  for (const [property, entries] of valuesByProperty) {
    const uniqueValues = [...new Set(entries.map((entry) => entry.value))];
    if (uniqueValues.length > 1) {
      conflicts.push({
        selector: group[0].selector,
        context: group[0].context,
        property,
        values: entries,
        finalValue: entries.at(-1)?.value,
      });
    }
  }
}

const report = {
  importedGlobalStylesheets: cssImports.map((file) => basename(file)),
  importedGlobalStylesheetCount: cssImports.length,
  selectorOccurrences: occurrences.length,
  repeatedSelectorContexts: duplicates.length,
  conflictingSelectorProperties: conflicts.length,
  topRepeatedSelectors: duplicates.sort((a, b) => b.occurrences.length - a.occurrences.length).slice(0, 50),
  topConflicts: conflicts.sort((a, b) => b.values.length - a.values.length).slice(0, 100),
};

console.log(JSON.stringify(report, null, 2));
