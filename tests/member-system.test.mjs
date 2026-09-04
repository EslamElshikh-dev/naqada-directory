import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20260904194733_member_auth_site_reviews.sql');
const auth = read('lib/auth/supabase-rest.ts');
const reviewsApi = read('app/api/site-reviews/route.ts');
const home = read('app/page.tsx');
const nextConfig = read('next.config.ts');

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
    'app/api/profile/route.ts',
    'app/api/admin/access/route.ts',
    'app/api/site-reviews/route.ts',
  ]) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
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
