import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260904194733_member_auth_site_reviews.sql');
const auth = read('lib/auth/supabase-rest.ts');
const reviewsApi = read('app/api/site-reviews/route.ts');
const home = read('app/page.tsx');
const nextConfig = read('next.config.ts');
const accountButton = read('components/auth/account-button.tsx');
const memberDashboard = read('components/auth/member-dashboard.tsx');
const landmarksPage = read('app/landmarks/page.tsx');
const sitemap = read('app/sitemap.ts');

test('member, admin, and authentication entry points are present', () => {
  for (const path of [
    'app/account/login/page.tsx',
    'app/account/register/page.tsx',
    'app/account/page.tsx',
    'app/admin/page.tsx',
    'app/api/auth/login/route.ts',
    'app/api/auth/register/route.ts',
    'app/api/auth/logout/route.ts',
    'app/api/auth/session/route.ts',
    'app/api/auth/google/route.ts',
    'app/api/auth/oauth-complete/route.ts',
    'app/account/oauth-callback/page.tsx',
    'app/api/profile/route.ts',
    'app/api/admin/access/route.ts',
    'app/api/site-reviews/route.ts',
  ]) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
});

test('Google OAuth validates the provider token before creating secure cookies', () => {
  const googleRoute = read('app/api/auth/google/route.ts');
  const oauthComplete = read('app/api/auth/oauth-complete/route.ts');
  const authForms = read('components/auth/auth-forms.tsx');
  assert.ok(googleRoute.includes("searchParams.set('provider', 'google')"));
  assert.ok(googleRoute.includes('/account/oauth-callback'));
  assert.ok(oauthComplete.includes('await getUser(accessToken)'));
  assert.ok(oauthComplete.includes('AUTH_ACCESS_COOKIE'));
  assert.ok(oauthComplete.includes('AUTH_REFRESH_COOKIE'));
  assert.ok(authForms.includes('المتابعة باستخدام Google'));
});

test('authentication cookies are server-only and production-safe', () => {
  assert.ok(auth.includes("AUTH_ACCESS_COOKIE = 'naqada_sb_access'"));
  assert.ok(auth.includes("AUTH_REFRESH_COOKIE = 'naqada_sb_refresh'"));
  assert.ok(auth.includes('httpOnly: true'));
  assert.ok(auth.includes("sameSite: 'lax'"));
  assert.ok(auth.includes("secure: process.env.NODE_ENV === 'production'"));
});

test('member data is protected by RLS and explicit role grants', () => {
  assert.ok(migration.includes('alter table public.member_profiles enable row level security'));
  assert.ok(migration.includes('alter table public.site_reviews enable row level security'));
  assert.ok(migration.includes('revoke all on table public.member_profiles from public, anon'));
  assert.ok(migration.includes('revoke all on table public.site_reviews from public, anon'));
  assert.ok(migration.includes('revoke all on table public.directory_admins from public, anon, authenticated'));
  assert.ok(migration.includes('(select auth.uid()) = id'));
  assert.ok(migration.includes('(select auth.uid()) = user_id'));
});

test('the only seeded administrator is the approved owner email', () => {
  assert.ok(migration.includes("'moqawel1215@gmail.com'"));
  assert.equal((migration.match(/@gmail\.com/g) || []).length, 1);
  assert.ok(migration.includes('public.is_directory_admin()'));
  assert.ok(migration.includes('public.get_naqada_admin_stats()'));
});

test('site reviews require a verified member and stay within validated bounds', () => {
  assert.ok(reviewsApi.includes('if (!session.user.emailVerified)'));
  assert.ok(reviewsApi.includes('rating < 1 || rating > 5'));
  assert.ok(reviewsApi.includes('review.length < 20 || review.length > 800'));
  assert.ok(reviewsApi.includes('on_conflict=user_id'));
  assert.ok(home.includes('<SiteReviews />'));
});

test('the deployment uses the Next.js server runtime for protected routes', () => {
  assert.ok(!nextConfig.includes("output: 'export'"));
});

test('Google profile photos are rendered with a constrained image host and graceful fallback', () => {
  assert.ok(nextConfig.includes("hostname: 'lh3.googleusercontent.com'"));
  assert.ok(accountButton.includes('user!.avatarUrl'));
  assert.ok(accountButton.includes('setFailedAvatarUrl'));
  assert.ok(memberDashboard.includes('profile.avatarUrl || user.avatarUrl'));
});

test('the visual landmarks guide uses local optimized image delivery and is indexable', () => {
  assert.ok(landmarksPage.includes("alternates: { canonical: '/landmarks' }"));
  assert.ok(landmarksPage.includes("'/images/landmarks/deir-mikhail-churches.webp'"));
  assert.ok(landmarksPage.includes('CC BY-SA 4.0'));
  assert.ok(sitemap.includes("{ path: '/landmarks'"));
});
