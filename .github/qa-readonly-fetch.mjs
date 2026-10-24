// Preload only in the Visual QA server. Application production code is unchanged.
const publicReadRpcs = new Set([
  'get_public_naqada_content',
  'get_public_site_reviews',
  'get_public_site_reviews_with_avatars',
  'get_public_site_review_summary',
  'is_published_naqada_photo',
  'is_published_naqada_article_media',
]);
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

export function readOnlyFetch(fetcher) {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const rpc = /^\/rest\/v1\/rpc\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    const publicRead = method === 'POST' && url.protocol === 'https:' && url.hostname.endsWith('.supabase.co') && publicReadRpcs.has(rpc);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !loopback.has(url.hostname) && !publicRead) {
      throw new Error(`QA_EXTERNAL_WRITE_BLOCKED: ${method} ${url.pathname}`);
    }
    return fetcher(input, init);
  };
}

if (process.env.NAQADA_QA_READ_ONLY === '1') globalThis.fetch = readOnlyFetch(globalThis.fetch);
