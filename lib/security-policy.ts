export function contentSecurityPolicy(nonce?: string, upgradeInsecureRequests = true) {
  return ["default-src 'self'", `script-src 'self' ${nonce ? "'nonce-" + nonce + "' 'strict-dynamic'" : "'unsafe-inline'"} https://connect.facebook.net`, "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https:", "font-src 'self' data:", "connect-src 'self' https://ceyjfguoomdlrtsujskj.supabase.co https://www.facebook.com https://connect.facebook.net", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "manifest-src 'self'", "report-to csp-endpoint", "report-uri /api/csp-report/", ...(upgradeInsecureRequests ? ["upgrade-insecure-requests"] : [])].join('; ');
}
export function dynamicDocument(pathname: string, params: URLSearchParams) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (/^\/(?:admin|moderator|claim)(?:\/|$)/.test(path) || ['/account','/contributor','/search','/directory-query','/news-query','/jobs-query'].includes(path)) return true;
  const keys: Record<string,string[]> = { '/directory':['q','category','locality','sort','page'], '/news':['section'], '/jobs':['q','view'] };
  return Boolean(keys[path]?.some(key => params.has(key)));
}
