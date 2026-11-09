import test from 'node:test';
import assert from 'node:assert/strict';
import { readJsonLd } from '../.github/read-jsonld.mjs';

const script = value => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const credit = { '@type': 'WebSite', '@id': 'https://example.com/#website', creator: { '@id': '#person' } };
const website = { '@type': 'WebSite', '@id': credit['@id'], potentialAction: { '@type': 'SearchAction', target: { urlTemplate: 'https://example.com/directory/?q={search_term_string}' } } };

test('site search survives partial credit nodes in either script order', () => {
  for (const values of [[credit, website], [website, credit]]) {
    const nodes = readJsonLd(values.map(value => script({ '@graph': [value] })).join(''));
    assert.equal(nodes.length, 1);
    assert.deepEqual(nodes[0].potentialAction, website.potentialAction);
    assert.deepEqual(nodes[0].creator, credit.creator);
  }
});

test('separate entities and anonymous nodes remain separate across arrays and graphs', () => {
  const nodes = readJsonLd(script([credit, { '@type': 'BreadcrumbList' }]) + script({ '@graph': [{ '@type': 'Organization', '@id': '#organization' }, { '@type': 'BreadcrumbList' }] }));
  assert.equal(nodes.length, 4);
  assert.equal(nodes[0].potentialAction, undefined);
});

test('missing and invalid schema stay detectable', () => {
  assert.deepEqual(readJsonLd('<main>No structured data</main>'), []);
  assert.throws(() => readJsonLd('<script type="application/ld+json">{broken}</script>'), SyntaxError);
});
