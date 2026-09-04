import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy';

export const SUPABASE_URL = 'https://ceyjfguoomdlrtsujskj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QsT7jYGw7sWx0v6Vbg2Vjw_-uFV8wMk';

export const AUTH_ACCESS_COOKIE = 'naqada_sb_access';
export const AUTH_REFRESH_COOKIE = 'naqada_sb_refresh';

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  created_at?: string;
  user_metadata?: { full_name?: string; avatar_url?: string; picture?: string };
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseUser;
};

export type MemberUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  emailVerified: boolean;
  createdAt: string;
};

export class SupabaseAuthError extends Error {
  constructor(message: string, public status = 400, public code = '') {
    super(message);
    this.name = 'SupabaseAuthError';
  }
}

export function restHeaders(accessToken?: string, json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function authRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: { ...restHeaders(accessToken, true), ...(init.headers || {}) },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.msg === 'string' ? data.msg : typeof data?.message === 'string' ? data.message : 'AUTH_REQUEST_FAILED';
    const code = typeof data?.error_code === 'string' ? data.error_code : typeof data?.code === 'string' ? data.code : '';
    throw new SupabaseAuthError(message, response.status, code);
  }
  return data as T;
}

export function mapMember(user: SupabaseUser): MemberUser {
  return {
    id: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.full_name?.trim() || 'عضو دليل نقادة',
    avatarUrl: user.user_metadata?.avatar_url?.trim() || user.user_metadata?.picture?.trim() || '',
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at || '',
  };
}

export async function signUp(email: string, password: string, name: string, redirectTo: string) {
  return authRequest<{ user: SupabaseUser; access_token?: string; refresh_token?: string; expires_in?: number }>(
    `signup?redirect_to=${encodeURIComponent(redirectTo)}`,
    { method: 'POST', body: JSON.stringify({ email, password, data: { full_name: name } }) },
  );
}

export async function signIn(email: string, password: string) {
  return authRequest<TokenResponse>('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getUser(accessToken: string) {
  return authRequest<SupabaseUser>('user', { method: 'GET' }, accessToken);
}

export async function refreshSession(refreshToken: string) {
  return authRequest<TokenResponse>('token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function updateUserName(accessToken: string, fullName: string) {
  return authRequest<SupabaseUser>('user', {
    method: 'PUT',
    body: JSON.stringify({ data: { full_name: fullName } }),
  }, accessToken);
}

export async function remoteSignOut(accessToken: string) {
  return authRequest('logout', { method: 'POST' }, accessToken);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export const authCookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function authErrorMessage(error: unknown) {
  if (!(error instanceof SupabaseAuthError)) return 'تعذر إتمام العملية الآن. حاول مرة أخرى.';
  const raw = `${error.code} ${error.message}`.toLowerCase();
  if (raw.includes('already') || raw.includes('user_already_exists')) return 'يوجد حساب مسجل بهذا البريد بالفعل.';
  if (raw.includes('invalid_credentials') || raw.includes('invalid login')) return 'بيانات الدخول غير صحيحة.';
  if (raw.includes('email_not_confirmed')) return 'أكد بريدك الإلكتروني أولًا ثم سجل الدخول.';
  if (raw.includes('weak_password')) return `استخدم ${PASSWORD_MIN_LENGTH} أحرف على الأقل مع حرف ورقم.`;
  if (raw.includes('rate') || error.status === 429) return 'محاولات كثيرة. حاول مرة أخرى بعد قليل.';
  return error.message === 'AUTH_REQUEST_FAILED' ? 'تعذر إتمام العملية الآن. حاول مرة أخرى.' : error.message;
}
