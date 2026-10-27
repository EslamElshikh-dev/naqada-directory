export const AUTH_RETURN_COOKIE = 'naqada_auth_return';
export function safeAuthReturn(value?: string | null) {
  if (!value || value.length > 1200 || !value.startsWith('/claim/')) return '/account/';
  try {
    const slug = decodeURIComponent(value.replace(/^\/claim\//, '').replace(/\/$/, ''));
    if (!/^[\p{L}\p{N}_-]{1,200}$/u.test(slug)) return '/account/';
    return '/claim/' + encodeURIComponent(slug) + '/';
  } catch { return '/account/'; }
}
