import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('app/about/developer/page.tsx', 'utf8');
const legacyPage = readFileSync('app/knowledge/developer/page.tsx', 'utf8');
const aboutPage = readFileSync('app/about/page.tsx', 'utf8');
const aboutCss = readFileSync('app/about/about.module.css', 'utf8');
const css = readFileSync('app/knowledge/developer/developer.module.css', 'utf8');
const showcase = readFileSync('components/developer-work-showcase.tsx', 'utf8');
const projectData = readFileSync('lib/developer-profile.ts', 'utf8');
const nav = readFileSync('components/knowledge-section-nav.tsx', 'utf8');
const knowledge = readFileSync('app/knowledge/page.tsx', 'utf8');
const shell = readFileSync('components/site-shell.tsx', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');
const visualQa = readFileSync('.github/visual-qa-v2.mjs', 'utf8');

test('developer portrait is stored with the site', () => {
  assert.equal(existsSync('public/images/eslam-elshikh.jpg'), true);
});

test('about pages are separated from the encyclopedia and connected to the site shell', () => {
  for (const source of [shell, sitemap]) {
    assert.match(source, /\/about\/developer/);
  }
  assert.doesNotMatch(nav, /developer/);
  assert.doesNotMatch(knowledge, /\/knowledge\/developer/);
  assert.match(legacyPage, /permanentRedirect\('\/about\/developer'\)/);
  assert.match(aboutPage, /مشروع محلي <em>خدمي وتطوعي ومجاني<\/em>/);
  assert.match(aboutPage, /isAccessibleForFree: true/);
  assert.match(nav, /current: KnowledgeSection/);
});

test('developer profile includes verified identity, metrics, and selected work', () => {
  assert.match(page, /المهندس إسلام الشيخ/);
  assert.match(page, /٤٧٢/);
  assert.match(page, /٢٣٣/);
  assert.match(page, /٧٣/);
  assert.match(projectData, /https:\/\/tawodco\.com\//);
  assert.match(projectData, /https:\/\/samascan\.vercel\.app\//);
  assert.match(projectData, /https:\/\/bowdylabs\.com\//);
  assert.match(projectData, /https:\/\/alahmadi-contracting-riyadh\.vercel\.app\//);
  assert.doesNotMatch(projectData, /alanoudfaraj|puritylife/);
});

test('about experience connects the four useful doors of the guide', () => {
  for (const path of ['/directory', '/villages', '/knowledge', '/news']) {
    assert.match(aboutPage, new RegExp(`href: '${path}'`));
  }
  assert.match(aboutPage, /أربعة أبواب للمكان/);
  assert.match(aboutPage, /experiencePaths\.map/);
  assert.match(aboutCss, /\.experienceGrid/);
  assert.match(aboutCss, /animation-timeline: view/);
});

test('selected work is interactive, accessible, and covered by visual QA', () => {
  assert.match(showcase, /'use client'/);
  assert.match(showcase, /aria-pressed/);
  assert.match(showcase, /aria-live="polite"/);
  assert.match(showcase, /DeveloperProjectFilter/);
  assert.match(projectData, /id: 'local'/);
  assert.match(projectData, /id: 'business'/);
  assert.match(projectData, /id: 'product'/);
  assert.match(projectData, /id: 'identity'/);
  assert.match(showcase, /next\/image/);
  assert.match(showcase, /project\.image/);
  assert.match(showcase, /CASE 0/);
  assert.match(css, /\.projectCard:first-child/);
  assert.match(visualQa, /\/about\/developer/);
  assert.match(visualQa, /\/about/);
  for (const image of ['tawod.webp', 'sama-scan.webp', 'bowdy-labs.webp', 'alahmadi.svg']) {
    assert.equal(existsSync(`public/images/developer-projects/${image}`), true);
  }
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
  assert.match(page, /'@type': 'ItemList'/);
  assert.match(page, /numberOfItems: developerProjects\.length/);
});

test('developer animations respect reduced-motion preferences', () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none/);
  assert.match(css, /animation-timeline: view/);
});
