import { NextRequest, NextResponse } from 'next/server';
import { reviewedActivityRedirect } from '@/lib/activity-path';
import { contentSecurityPolicy, dynamicDocument } from '@/lib/security-policy';
export function proxy(request: NextRequest) {
  const activity = /^\/activity\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  const target = activity ? reviewedActivityRedirect(activity[1]) : null;
  let village = ''; try { village = decodeURIComponent(request.nextUrl.pathname); } catch {}
  const destination = target || (/^\/villages\/مركز-نقاد[هة]\/?$/.test(village) ? '/villages/' : null);
  if (destination) {
    const url = request.nextUrl.clone(); url.pathname = destination;
    const redirect = NextResponse.redirect(url,308);
    redirect.headers.set('Cache-Control','public, max-age=3600');
    return redirect;
  }
  const dynamic = dynamicDocument(request.nextUrl.pathname, request.nextUrl.searchParams);
  const nonce = dynamic ? Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64') : undefined;
  const loopbackHttp = request.nextUrl.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(request.nextUrl.hostname);
  const policy = contentSecurityPolicy(nonce,!loopbackHttp);
  const headers = new Headers(request.headers);
  headers.delete('x-nonce'); headers.set('content-security-policy',policy);
  if (nonce) headers.set('x-nonce',nonce);
  let response: NextResponse;
  if (dynamic && /^\/(?:directory|news|jobs)\/?$/.test(request.nextUrl.pathname)) {
    // Next's query `has` rules skip a single empty value. A nonced response
    // must render the dynamic document even for an empty filter submission.
    const url = request.nextUrl.clone();
    url.pathname = `${url.pathname.replace(/\/+$/, '')}-query/`;
    response = NextResponse.rewrite(url, { request: { headers } });
  } else {
    response = NextResponse.next({ request: { headers } });
  }
  response.headers.set('Content-Security-Policy',policy);
  response.headers.set('Reporting-Endpoints',`csp-endpoint="${request.nextUrl.origin}/api/csp-report/"`);
  if (dynamic) response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
// The homepage keeps the same public policy through next.config headers.
export const config = { matcher: ['/((?!$|api/|_next/|.*\\.(?:ico|svg|png|jpg|jpeg|webp|avif|js|css|woff2|txt|xml)$|.*opengraph-image).*)'] };
