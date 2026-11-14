// Vercel: exit 0 skips the build; every uncertain case exits 1 and builds.
// Production, first branch builds and explicit rebuilds always build in full.
import { execFileSync } from 'node:child_process';

const env = process.env;
const sha = /^[a-f0-9]{40}$/i;
const expectedProject = 'prj_FlW8Tu9Ym4pylF6SdrNG2JYBtKzI';
const git = (...args) => execFileSync('git', args, {
  encoding: 'utf8', timeout: 5000, maxBuffer: 4 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
});

function decision() {
  if (env.VERCEL_ENV !== 'preview') return 'build_production_or_unknown_environment';
  if (env.NAQADA_FORCE_BUILD === '1') return 'build_explicit_override';
  if (env.VERCEL !== '1' || env.VERCEL_PROJECT_ID !== expectedProject ||
      env.VERCEL_GIT_PROVIDER !== 'github' || env.VERCEL_GIT_REPO_ID !== '1355551665' ||
      !env.VERCEL_GIT_COMMIT_REF || env.VERCEL_GIT_COMMIT_REF === 'main') return 'build_unverified_context';
  const previous = env.VERCEL_GIT_PREVIOUS_SHA || '';
  const current = env.VERCEL_GIT_COMMIT_SHA || '';
  if (!sha.test(previous) || !sha.test(current) || /^0+$/.test(previous)) return 'build_missing_successful_baseline';
  if (previous === current) return 'build_same_commit_redeploy';
  if (git('rev-parse', 'HEAD').trim() !== current) return 'build_checkout_mismatch';
  git('cat-file', '-e', `${previous}^{commit}`);
  // Do not fetch history or substitute HEAD^: a failed intervening application
  // commit must remain in the diff even when the latest commit changes docs.
  git('merge-base', '--is-ancestor', previous, current);
  const diff = git('diff', '--name-status', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', previous, current, '--');
  if (!diff) return 'build_empty_diff';
  if (!diff.endsWith('\0')) return 'build_unrecognized_diff';
  const fields = diff.slice(0, -1).split('\0');
  if (fields.length % 2) return 'build_unrecognized_diff';
  for (let index = 0; index < fields.length; index += 2) {
    const [status, path] = fields.slice(index, index + 2);
    if (!['A', 'M', 'D'].includes(status) || path.split('/').some(part => !part || part === '.' || part === '..')) return 'build_unrecognized_change';
    if (path !== 'README.md' && !path.startsWith('docs/') && !path.startsWith('tests/')) return 'build_application_change';
  }
  return 'skip_preview_docs_tests_only';
}

let reason = 'build_git_or_script_error';
try { reason = decision(); } catch { /* A missing commit, Git failure or shallow history must build. */ }
const skip = reason === 'skip_preview_docs_tests_only';
console.log(JSON.stringify({ event: 'NAQADA_BUILD_DECISION', decision: skip ? 'skip' : 'build', reason }));
process.exitCode = skip ? 0 : 1;
