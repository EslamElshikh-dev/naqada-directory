import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText + '\n//# sourceURL=' + path;
const { validateArticleDocument, readArticleDocument, safeImagePath } = await import('data:text/javascript;base64,' + Buffer.from(compile('../lib/article-document.ts')).toString('base64'));
const catalogModules = new Map();
function loadCatalog(path) {
  if (catalogModules.has(path)) return catalogModules.get(path).exports;
  const record = { exports: {} }; catalogModules.set(path, record);
  const js = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', js)(name => loadCatalog(resolve(dirname(path), name + '.ts')), record, record.exports);
  return record.exports;
}
const { allEditorialPosts: editorialPosts } = loadCatalog(fileURLToPath(new URL('../lib/editorial-posts-all.ts', import.meta.url)));
const { roleModels } = await import('data:text/javascript;base64,' + Buffer.from(compile('../lib/role-models.ts')).toString('base64'));

test('existing illustrated article retains every section, picture, timeline and source through a full edit', () => {
  for (const post of editorialPosts) {
    const doc = { format: 'editorial', content: post, sharing: { title: '', description: '' } };
    const edited = validateArticleDocument(doc, 'article', post.slug, true);
    assert.deepEqual(edited.content.hero, post.hero);
    assert.deepEqual(edited.content.sections.map(s => s.paragraphs), post.sections.map(s => s.paragraphs));
    assert.deepEqual(edited.content.sources, post.sources);
    assert.equal(edited.content.sections.length, post.sections.length);
    for (let n = 0; n < post.sections.length; n++) {
      assert.deepEqual(edited.content.sections[n].image, post.sections[n].image);
      assert.deepEqual(edited.content.sections[n].sources, post.sections[n].sources);
      assert.deepEqual(edited.content.sections[n].timeline, post.sections[n].timeline);
    }
    assert.deepEqual(readArticleDocument({ document: JSON.stringify(edited) }), edited);
  }
});

test('all role model stories including Ahmed and Aya preserve their portraits, sources and paragraphs', () => {
  for (const person of roleModels) {
    const doc = validateArticleDocument({ format: 'role_model', content: person, sharing: { title: '', description: '' } }, 'role_model', person.slug, true);
    assert.deepEqual(doc.content.photos, person.photos);
    assert.deepEqual(doc.content.sections, person.sections);
    assert.equal(doc.content.sourceUrl, person.sourceUrl);
    assert.equal(doc.content.rewrittenBy, person.rewrittenBy);
    assert.deepEqual(doc.content.socialImage, person.socialImage);
  }
});

test('rejects unsafe images, unsafe source links, invalid dates and out-of-range portrait selection', () => {
  assert.equal(safeImagePath('//evil.test/file.jpg'), false);
  assert.equal(safeImagePath(['/images/', '../', 'secret.webp'].join('')), false);
  assert.equal(safeImagePath('https://evil.test/image.webp'), false);
  const doc = () => structuredClone({ format: 'role_model', content: roleModels[0], sharing: { title: '', description: '' } });
  let value = doc(); value.content.sourceUrl = 'javascript:alert(1)';
  assert.throws(() => validateArticleDocument(value, 'role_model', value.content.slug, true));
  value = doc(); value.content.publishedAt = '2026-02-31';
  assert.throws(() => validateArticleDocument(value, 'role_model', value.content.slug, true));
  value = doc(); value.content.cardPhotoIndex = 900;
  assert.throws(() => validateArticleDocument(value, 'role_model', value.content.slug, true));
  value = doc(); value.sharing.image = { src: '//evil.test/image.webp', alt: 'صورة', width: 1200, height: 630 };
  assert.throws(() => validateArticleDocument(value, 'role_model', value.content.slug, true));
});
