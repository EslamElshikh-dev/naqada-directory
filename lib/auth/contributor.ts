import { SUPABASE_URL, restHeaders } from '@/lib/auth/supabase-rest';

export type ContributorAccess = {
  contributorId: string;
  slug: string;
  displayName: string;
  honorific: string | null;
  roleCode: string;
  roleLabel: string;
  badges: string[];
  primaryWork: string | null;
  isAuthor: boolean;
  permissions: string[];
};

type AccountRow = { contributor_id: string; active: boolean };
type ProfileRow = {
  id: string;
  slug: string;
  display_name: string;
  honorific: string | null;
  role_code: string;
  role_label: string;
  badges: string[] | null;
  primary_work: string | null;
  is_author: boolean;
};
type PermissionRow = { permission: string; enabled: boolean };

async function restGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: restHeaders(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('CONTRIBUTOR_ACCESS_FAILED');
  return response.json() as Promise<T>;
}

export async function getContributorAccess(accessToken: string, userId: string): Promise<ContributorAccess | null> {
  const accounts = await restGet<AccountRow[]>(
    `directory_contributor_accounts?select=contributor_id,active&user_id=eq.${encodeURIComponent(userId)}&active=eq.true&limit=1`,
    accessToken,
  );
  const account = accounts[0];
  if (!account) return null;

  const [profiles, permissions] = await Promise.all([
    restGet<ProfileRow[]>(
      `directory_contributors?select=id,slug,display_name,honorific,role_code,role_label,badges,primary_work,is_author&id=eq.${encodeURIComponent(account.contributor_id)}&status=eq.active&limit=1`,
      accessToken,
    ),
    restGet<PermissionRow[]>(
      `directory_contributor_permissions?select=permission,enabled&contributor_id=eq.${encodeURIComponent(account.contributor_id)}&enabled=eq.true`,
      accessToken,
    ),
  ]);
  const profile = profiles[0];
  if (!profile) return null;

  return {
    contributorId: profile.id,
    slug: profile.slug,
    displayName: profile.display_name,
    honorific: profile.honorific,
    roleCode: profile.role_code,
    roleLabel: profile.role_label,
    badges: profile.badges || [],
    primaryWork: profile.primary_work,
    isAuthor: profile.is_author,
    permissions: permissions.map((item) => item.permission),
  };
}
