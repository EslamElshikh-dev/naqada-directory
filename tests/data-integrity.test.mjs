import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const catalog = load('catalog');
const businesses = ['01', '02', '03', '04'].flatMap((part) => load(`businesses-${part}`));
const localities = load('localities');
const families = load('families');
const people = load('people');
const landmarks = load('landmarks');
const canonicalLocality = (value) => {
  const raw = value?.trim() || 'مركز نقادة';
  return raw.split('/')[0]?.trim() || raw;
};

test('published datasets match the declared catalog totals', () => {
  assert.equal(businesses.length, catalog.meta.businessCount);
  assert.equal(localities.length, catalog.meta.localityCount);
  assert.equal(families.length, catalog.meta.familyCount);
  assert.equal(people.length, catalog.meta.peopleCount);
  assert.equal(landmarks.length, catalog.meta.landmarkCount);
});

test('business identifiers and public slugs are unique', () => {
  assert.equal(new Set(businesses.map((item) => item.id)).size, businesses.length);
  assert.equal(new Set(businesses.map((item) => item.slug)).size, businesses.length);
  assert.ok(businesses.every((item) => item.status === 'ready'));
  assert.ok(businesses.every((item) => item.verification === 'A'));
});

test('category counts are derived correctly', () => {
  for (const category of catalog.categoryCounts) {
    assert.equal(businesses.filter((item) => item.category === category.name).length, category.count, category.name);
  }
});

test('nested activity localities collapse to one canonical route name', () => {
  const nested = businesses.filter((item) => item.locality?.includes('/'));
  assert.ok(nested.length > 0, 'expected at least one nested locality fixture');
  assert.ok(nested.every((item) => !canonicalLocality(item.locality).includes('/')));
  assert.ok(nested.every((item) => canonicalLocality(item.locality).length > 0));
});

test('canonical locality normalization preserves all published businesses', () => {
  const canonicalCounts = new Map();
  for (const business of businesses) {
    const locality = canonicalLocality(business.locality);
    canonicalCounts.set(locality, (canonicalCounts.get(locality) || 0) + 1);
  }
  const canonicalTotal = [...canonicalCounts.values()].reduce((sum, count) => sum + count, 0);
  assert.equal(canonicalTotal, businesses.length);
});

test('restricted review states and grade C are absent from public records', () => {
  const publicRecords = [...families, ...people, ...landmarks];
  assert.ok(publicRecords.every((item) => !['manual_review', 'official_review', 'research_only'].includes(item.status)));
  assert.ok(publicRecords.every((item) => item.grade !== 'C'));
});

test('web source links use https', () => {
  const references = [
    ...businesses.flatMap((item) => [item.mapsUrl].filter(Boolean)),
    ...localities.flatMap((item) => [item.source].filter(Boolean)),
    ...families.flatMap((item) => [item.source1, item.source2].filter(Boolean)),
    ...people.flatMap((item) => [item.source1, item.source2].filter(Boolean)),
    ...landmarks.flatMap((item) => [item.source1, item.source2].filter(Boolean)),
  ];
  const webUrls = references.filter((url) => /^https?:\/\//.test(url));
  assert.ok(webUrls.length > 0);
  assert.ok(webUrls.every((url) => url.startsWith('https://')));
});
