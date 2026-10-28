import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = '.next/static';
function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    const file = join(directory, name);
    return statSync(file).isDirectory() ? walk(file) : /\.(?:css|js)$/.test(file) ? [file] : [];
  });
}
const largest = walk(root).map(file => {
  const bytes = readFileSync(file);
  return { file: relative(root, file), bytes: bytes.length, gzip: gzipSync(bytes).length };
}).sort((a, b) => b.bytes - a.bytes).slice(0, 10);
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), largest }, null, 2));
