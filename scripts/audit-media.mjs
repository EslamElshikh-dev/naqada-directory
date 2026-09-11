import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const publicImages = join(root, 'public', 'images');
const sourceRoots = ['app', 'components', 'lib', 'data', 'tests', 'scripts'];
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.css', '.md', '.yml', '.yaml']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif']);
const imageReferencePattern = /\/images\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|svg|avif)/gi;

function walk(directory, predicate = () => true) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

const sourceFiles = sourceRoots.flatMap((directory) =>
  walk(join(root, directory), (path) => textExtensions.has(extname(path).toLowerCase())),
);

const referencesByPath = new Map();
for (const sourceFile of sourceFiles) {
  const text = readFileSync(sourceFile, 'utf8');
  const matches = [...text.matchAll(imageReferencePattern)].map((match) => match[0]);
  for (const publicPath of new Set(matches)) {
    if (!referencesByPath.has(publicPath)) referencesByPath.set(publicPath, []);
    referencesByPath.get(publicPath).push(relative(root, sourceFile).replaceAll('\\', '/'));
  }
}

const referencedPaths = new Set(referencesByPath.keys());
const localAssets = walk(publicImages, (path) => imageExtensions.has(extname(path).toLowerCase()));
const localPublicPaths = new Set(
  localAssets.map((path) => `/images/${relative(publicImages, path).replaceAll('\\', '/')}`),
);

const brokenReferences = [...referencedPaths]
  .filter((path) => !localPublicPaths.has(path))
  .sort()
  .map((path) => ({ path, sources: referencesByPath.get(path) || [] }));
const unusedAssets = [...localPublicPaths].filter((path) => !referencedPaths.has(path)).sort();
const totalBytes = localAssets.reduce((sum, path) => sum + statSync(path).size, 0);
const unusedBytes = unusedAssets.reduce((sum, publicPath) => {
  const filePath = join(root, 'public', publicPath.replace(/^\//, ''));
  return sum + statSync(filePath).size;
}, 0);

const report = {
  localAssets: localAssets.length,
  referencedLocalAssets: localAssets.length - unusedAssets.length,
  brokenReferences,
  unusedAssets,
  totalBytes,
  unusedBytes,
};

console.log(JSON.stringify(report, null, 2));

if (brokenReferences.length > 0) {
  console.error(`Found ${brokenReferences.length} broken local image reference(s).`);
  process.exit(1);
}
