import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const layout = read('app/layout.tsx');
const sitemap = read('app/sitemap.ts');
const robots = read('app/robots.ts');
const site = read('lib/site.ts');
const contribute = read('app/contribute/page.tsx');
const privacy = read('app/privacy/page.tsx');
const activities = read('app/activities/page.tsx');
const villages = read('app/villages/page.tsx');
const blog = read('app/blog/page.tsx');
const activityPage = read('app/activities/[slug]/page.tsx');
const activityData = read('lib/activity-landings.ts');
const listingPage = read('app/listing/[slug]/page.tsx');
const businesses05 = read('data/businesses-05.json');
const villagePage = read('app/villages/[slug]/page.tsx');
const villageCategoryPage = read('app/villages/[slug]/[category]/page.tsx');
const villageArticleIndex = read('lib/village-articles/index.ts');

const officialOrigin = 'https://naqada-directory.vercel.app';
const verificationToken = 'a5AfDDI67VsUYxqSvx00gPy5bqSb1V9YoZ1DX8-GkxY';

test('official Vercel origin and Search Console verification stay pinned', () => {
  assert.ok(site.includes(`url: '${officialOrigin}'`));
  assert.ok(layout.includes(verificationToken));
  assert.ok(layout.includes('<html lang="ar-EG"'));
});

test('indexable pages expose unrestricted Google preview directives', () => {
  for (const source of [layout, site]) {
    assert.ok(source.includes("'max-image-preview': 'large'"));
    assert.ok(source.includes("'max-snippet': -1"));
    assert.ok(source.includes("'max-video-preview': -1"));
  }
  assert.ok(site.includes('robots: robots ?? defaultIndexRobots'));
});

test('canonical URLs match the trailing-slash production URL shape', () => {
  assert.ok(site.includes('export function canonicalPath'));
  assert.ok(site.includes("return `${normalizedPath.replace(/\\/+$/, '')}/`;"));
  assert.ok(site.includes('alternates: { canonical: normalizedPath }'));
  assert.ok(activityPage.includes('const pageUrl = `${siteConfig.url}/activities/${encodeURIComponent(activity.slug)}/`;'));
});

test('robots.txt stays crawlable and points at the canonical sitemap', () => {
  assert.ok(robots.includes("allow: '/'"));
  assert.ok(robots.includes('sitemap: `${siteConfig.url}/sitemap.xml`'));
});

test('utility workflows are noindex-follow and excluded from the sitemap', () => {
  for (const source of [contribute, privacy]) {
    assert.ok(source.includes('index: false'));
    assert.ok(source.includes('follow: true'));
  }
  assert.ok(!sitemap.includes("{ path: '/contribute'"));
  assert.ok(!sitemap.includes("{ path: '/privacy'"));
});

test('sitemap remains focused on canonical content collections and listings', () => {
  assert.ok(sitemap.includes('...categories.map'));
  assert.ok(sitemap.includes('indexableActivities'));
  assert.ok(sitemap.includes('getBusinessesForActivity(activity).length >= 2'));
  assert.ok(sitemap.includes('...indexableLocalities.map'));
  assert.ok(sitemap.includes('item.count >= 3'));
  assert.ok(sitemap.includes('...businesses.map'));
});

test('search landing pages connect activity intent to published business names', () => {
  assert.ok(activities.includes('buildPageMetadata({'));
  assert.ok(activities.includes("path: '/activities/'"));
  assert.ok(activities.includes("title: 'دليل خدمات وأنشطة نقادة | صيدليات وأطباء ومدارس ومطاعم'"));
  assert.ok(activities.includes('<h1>دليل خدمات وأنشطة <em>نقادة</em></h1>'));
  assert.ok(activities.includes('activityLandings.map'));
  assert.ok(activityPage.includes('generateStaticParams'));
  assert.ok(activityPage.includes("'@type': 'ItemList'"));
  assert.ok(activityPage.includes('activityKeywords(activity.name, activity.searchLabel)'));
  assert.ok(activityPage.includes('<h2>دليل {activity.name}: الأسماء والعناوين</h2>'));
  assert.ok(activityData.includes("name: 'صيدليات نقادة'"));
  assert.ok(activityData.includes("name: 'مدارس ومعاهد نقادة'"));
  assert.ok(activityData.includes("name: 'محلات وأسواق نقادة'"));
  assert.ok(activityData.includes("name: 'نظارات وبصريات في نقادة'"));
  assert.ok(listingPage.includes('businessSummary({ ...listing, locality })'));
  assert.ok(listingPage.includes('title: `${listing.name} في ${locality}`'));
});

test('villages hub owns generic village-directory intent', () => {
  assert.ok(villages.includes('buildPageMetadata({'));
  assert.ok(villages.includes("path: '/villages/'"));
  assert.ok(villages.includes("title: 'دليل قرى ونجوع نقادة | القرى والعزب والخدمات'"));
  assert.ok(villages.includes('<h1>دليل قرى ونجوع <em>نقادة</em></h1>'));
  assert.ok(villages.includes('name: `دليل ${item.name}`'));
  assert.ok(villages.includes('دليل بشلاو ودليل الأوسط قمولا'));
});

test('hub pages emit page-specific Open Graph and Twitter metadata', () => {
  for (const source of [activities, villages]) {
    assert.ok(source.includes('buildPageMetadata({'));
  }
  assert.ok(site.includes('openGraph: {'));
  assert.ok(site.includes('twitter: {'));
  assert.ok(site.includes('title,'));
  assert.ok(site.includes('description,'));
});

test('village pages explicitly own directory and locality search intent', () => {
  assert.ok(villageArticleIndex.includes('function strengthenDirectoryIntent'));
  assert.ok(villageArticleIndex.includes('`دليل ${locality}`'));
  assert.ok(villageArticleIndex.includes('`${locality} نقادة`'));
  assert.ok(villageArticleIndex.includes('`خدمات ${locality}`'));
  assert.ok(villageArticleIndex.includes('`أنشطة ${locality}`'));
  assert.ok(villageArticleIndex.includes('seoTitle: `دليل ${locality} في نقادة | خدمات وأنشطة ${locality} | دليل نقادة`'));
});

test('blog schema contains editorial posts only and routes directory intent to villages', () => {
  assert.ok(blog.includes('const totalPosts = allEditorialPosts.length;'));
  assert.ok(blog.includes('blogPost: allEditorialPosts.map'));
  assert.ok(!blog.includes('...villageArticles.map'));
  assert.ok(blog.includes('عبارة «دليل + اسم القرية» مملوكة لصفحة القرية نفسها'));
  assert.ok(blog.includes('دليل بشلاو'));
  assert.ok(blog.includes('<Link href="/villages"'));
});

test('listing SEO keyword routing only rewrites nursery intent', () => {
  assert.ok(businesses05.includes('"مطور اندرويد نقادة"'));
  assert.ok(listingPage.includes("const isNurseryKeyword = /حضان|أطفال|رياض/.test(keyword);"));
  assert.ok(listingPage.includes("if (!isNurseryKeyword) return { searchTerm: keyword, isLocal: false };"));
  assert.ok(listingPage.includes('const { searchTerm, isLocal } = resolveSeoKeywordSearch(keyword);'));
  assert.ok(!listingPage.includes("const isLocal = keyword.includes('الخطارة');\n            const searchTerm = keyword === 'حضانة' || keyword.includes('نقادة') || isLocal"));
});

test('legacy village names redirect with header-safe canonical URLs', () => {
  for (const source of [villagePage, villageCategoryPage]) {
    assert.ok(source.includes('getCanonicalLocalitySlugAlias'));
    assert.ok(source.includes('encodeURIComponent(canonicalAlias)'));
  }
});

test('deprecated sitelinks SearchAction markup is not emitted', () => {
  assert.ok(!layout.includes("'@type': 'SearchAction'"));
});
