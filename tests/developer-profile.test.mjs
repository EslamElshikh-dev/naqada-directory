import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('app/knowledge/developer/page.tsx', 'utf8');
const css = readFileSync('app/knowledge/developer/developer.module.css', 'utf8');
const nav = readFileSync('components/knowledge-section-nav.tsx', 'utf8');
const knowledge = readFileSync('app/knowledge/page.tsx', 'utf8');
const shell = readFileSync('components/site-shell.tsx', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');

test('developer portrait is stored with the site', () => {
  assert.equal(existsSync('public/images/eslam-elshikh.jpg'), true);
});

test('developer profile is connected to the encyclopedia and site shell', () => {
  for (const source of [nav, knowledge, shell, sitemap]) {
    assert.match(source, /\/knowledge\/developer/);
  }
  assert.match(nav, /current: KnowledgeSection/);
});

test('developer profile includes verified identity, metrics, and selected work', () => {
  assert.match(page, /المهندس إسلام الشيخ/);
  assert.match(page, /٤٧٢/);
  assert.match(page, /٢٣٣/);
  assert.match(page, /٧٣/);
  assert.match(page, /https:\/\/tawodco\.com\//);
  assert.match(page, /https:\/\/samascan\.vercel\.app\//);
  assert.match(page, /https:\/\/bowdylabs\.com\//);
  assert.match(page, /https:\/\/alahmadi-contracting-riyadh\.vercel\.app\//);
  assert.match(page, /https:\/\/alanoudfaraj\.com\//);
  assert.match(page, /https:\/\/puritylife\.vercel\.app\//);
});

test('developer profile connects the official social channels', () => {
  assert.match(page, /https:\/\/github\.com\/EslamElshikh-dev/);
  assert.match(page, /https:\/\/x\.com\/remoesoo10/);
  assert.match(page, /https:\/\/www\.instagram\.com\/remoesoo10/);
  assert.match(page, /https:\/\/www\.threads\.net\/@remoesoo10/);
  assert.match(page, /https:\/\/www\.youtube\.com\/@remoesoo10/);
  assert.match(page, /https:\/\/www\.tiktok\.com\/@remoesoo/);
  assert.match(page, /rel="noreferrer me"/);
});

test('developer profile publishes Person and ProfilePage structured data', () => {
  assert.match(page, /'@type': 'ProfilePage'/);
  assert.match(page, /'@type': 'Person'/);
  assert.match(page, /Q138800449/);
  assert.match(page, /EslamElshikh-dev/);
});

test('developer animations respect reduced-motion preferences', () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none/);
  assert.match(css, /animation-timeline: view/);
});
