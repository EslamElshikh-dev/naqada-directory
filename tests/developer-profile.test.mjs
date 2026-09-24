import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('app/developer/page.tsx', 'utf8');
const formerPage = readFileSync('app/about/developer/page.tsx', 'utf8');
const legacyPage = readFileSync('app/knowledge/developer/page.tsx', 'utf8');
const aboutPage = readFileSync('app/about/page.tsx', 'utf8');
const aboutCss = readFileSync('app/about/about.module.css', 'utf8');
const css = readFileSync('app/knowledge/developer/developer.module.css', 'utf8');
const pageCss = readFileSync('app/developer/developer.module.css', 'utf8');
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

test('developer has a standalone canonical route and legacy links redirect', () => {
  for (const source of [shell, sitemap]) {
    assert.match(source, /\/developer/);
  }
  assert.doesNotMatch(nav, /developer/);
  assert.doesNotMatch(knowledge, /\/knowledge\/developer/);
  assert.match(legacyPage, /permanentRedirect\('\/developer'\)/);
  assert.match(formerPage, /permanentRedirect\('\/developer'\)/);
  assert.match(page, /const pagePath = '\/developer'/);
  assert.match(aboutPage, /مشروع محلي <em>خدمي وتطوعي ومجاني<\/em>/);
  assert.match(aboutPage, /isAccessibleForFree: true/);
  assert.match(nav, /current: KnowledgeSection/);
});

test('developer story and five real projects start with the hometown directory', () => {
  assert.match(page, /المهندس إسلام الشيخ/);
  assert.match(page, /العسيرات/);
  assert.match(page, /جامعة ٦ أكتوبر/);
  assert.match(page, /الجامعة العربية المفتوحة/);
  const projectTitles = [...projectData.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(projectTitles.length, 5);
  assert.equal(projectTitles[0], 'دليل وموسوعة العسيرات');
  assert.match(projectData, /https:\/\/usayrat\.online\//);
  assert.match(projectData, /https:\/\/tawodco\.com\//);
  assert.match(projectData, /https:\/\/samascan\.vercel\.app\//);
  assert.match(projectData, /https:\/\/bowdylabs\.com\//);
  assert.match(projectData, /href: '\/'/);
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
  assert.match(showcase, /next\/image/);
  assert.match(showcase, /project\.image/);
  assert.match(showcase, /CASE 0/);
  assert.match(css, /\.projectCard:first-child/);
  assert.match(visualQa, /\['developer', '\/developer'\]/);
  assert.match(visualQa, /\/about/);
  for (const image of ['usayrat.webp', 'tawod.webp', 'sama-scan.webp', 'bowdy-labs.webp']) {
    assert.equal(existsSync(`public/images/developer-projects/${image}`), true);
  }
});

test('developer profile connects the official social channels', () => {
  assert.match(page, /https:\/\/github\.com\/EslamElshikh-dev/);
  assert.match(page, /https:\/\/www\.eslam-elshikh\.com\//);
  assert.match(page, /https:\/\/me\.developers\.google\.com\/u\/EslamElshikh/);
  assert.match(page, /rel="noreferrer me"/);
});

test('developer profile publishes Person and ProfilePage structured data', () => {
  assert.match(page, /'@type': 'ProfilePage'/);
  assert.match(page, /'@type': 'Person'/);
  assert.match(page, /birthDate: '1998-04-21'/);
  assert.match(page, /EslamElshikh-dev/);
  assert.match(page, /'@type': 'ItemList'/);
  assert.match(page, /numberOfItems: developerProjects\.length/);
});

test('developer animations respect reduced-motion preferences', () => {
  assert.match(pageCss, /prefers-reduced-motion: reduce/);
  assert.match(pageCss, /animation: none/);
  assert.match(css, /animation-timeline: view/);
});
