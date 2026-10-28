const CACHE = 'naqada-offline-v2';
const INDEX = '/__naqada_offline_index__';
const OFFLINE = '/offline.html';
const MAX_BYTES = 14 * 1024 * 1024;
const MAX_ENTRIES = 149; // Reserve one record for the cache index.
const PINNED = new Set(['/', '/emergency/', OFFLINE]);
let writes = Promise.resolve();
function navigationKind(url) {
  if (url.origin !== self.location.origin || url.search) return null;
  const path = url.pathname;
  if (PINNED.has(path)) return 'pinned';
  if (/^\/(?:listing|activity)\/[^/]+\/$/.test(path)) return 'listing';
  if (/^\/(?:villages|directory|activities|blog|role-models|knowledge)(?:\/[^/]+){0,2}\/$/.test(path)) return 'public';
  return null;
}
function asset(url) {
  if (url.origin !== self.location.origin) return false;
  if (!url.search && /^\/styles\/widgets\/(?:sanad|notifications|search|reviews|cards)\.css$/.test(url.pathname)) return true;
  if (/^\/_next\/image\/?$/.test(url.pathname)) {
    const value = url.searchParams.get('url');
    if (!value) return false;
    try {
      const source = new URL(value, self.location.origin);
      return source.origin === self.location.origin && (/^\/(?:images|app-icons)\//.test(source.pathname) || source.pathname === '/icon.svg');
    } catch { return false; }
  }
  return /^(?:\/_next\/static\/|\/app-icons\/|\/images\/|\/scripts\/)/.test(url.pathname);
}
function victims(index) {
  const entries = Object.entries(index).sort((a, b) => a[1].at - b[1].at);
  const removed = new Set();
  for (const [kind, max] of [['listing', 20], ['public', 10]]) {
    const group = entries.filter(([, item]) => item.kind === kind);
    for (const [key] of group.slice(0, Math.max(0, group.length - max))) removed.add(key);
  }
  let retained = entries.filter(([key]) => !removed.has(key));
  let bytes = retained.reduce((sum, [, item]) => sum + item.bytes, 0);
  let count = retained.length;
  for (const [key, item] of retained) {
    if (bytes <= MAX_BYTES && count <= MAX_ENTRIES) break;
    if (item.kind === 'pinned') continue;
    removed.add(key); bytes -= item.bytes; count--;
  }
  return [...removed];
}
function serialized(action) {
  const operation = writes.then(action); writes = operation.catch(() => {}); return operation;
}
async function readIndex(cache) {
  const response = await cache.match(INDEX);
  return response ? response.json().catch(() => ({})) : {};
}
function remember(request, response, kind) {
  return serialized(async () => {
    if (!response.ok || response.type === 'opaque' || response.headers.has('set-cookie')) return;
    const restricted = /(?:no-store|private)/i.test(response.headers.get('cache-control') || '');
    const url = new URL(typeof request === 'string' ? request : request.url, self.location.origin);
    // Next's dynamic public HTML uses private/no-store by default. An explicit
    // anonymous-document marker permits a local offline snapshot only; it does
    // not change HTTP/CDN caching or permit private routes, APIs or query pages.
    if (restricted && (kind === 'asset' || !navigationKind(url) || !/text\/html/i.test(response.headers.get('content-type') || ''))) return;
    const data = await response.clone().arrayBuffer();
    if (data.byteLength > 2 * 1024 * 1024) return;
    if (restricted && !/<meta\s+name="naqada-public-snapshot"\s+content="anonymous"\s*\/?>/i.test(new TextDecoder().decode(data))) return;
    const cache = await caches.open(CACHE), index = await readIndex(cache);
    await cache.put(request, response);
    const key = typeof request === 'string' ? new URL(request, self.location.origin).href : request.url;
    index[key] = { kind, bytes: data.byteLength, at: Date.now() };
    for (const old of victims(index)) { await cache.delete(old); delete index[old]; }
    await cache.put(INDEX, new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } }));
  });
}
function forget(request) {
  return serialized(async () => {
    const cache = await caches.open(CACHE), index = await readIndex(cache);
    await cache.delete(request); delete index[request.url];
    await cache.put(INDEX, new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } }));
  });
}
async function offlineResponse(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  if (!saved) return (await cache.match(OFFLINE)) || Response.error();
  if (!/text\/html/i.test(saved.headers.get('content-type') || '')) return saved;
  const html = await saved.text();
  const headers = new Headers(saved.headers); headers.delete('content-length'); headers.delete('content-encoding');
  headers.set('Cache-Control', 'no-store'); headers.set('Server-Timing', 'naqada_offline;dur=0');
  return new Response(html, { status: 200, headers });
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    for (const path of [OFFLINE, '/', '/emergency/', '/app-icons/icon-192.png']) {
      try { const response = await fetch(path, { cache: 'reload' }); await remember(path, response, PINNED.has(path) ? 'pinned' : 'asset'); } catch {}
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('naqada-offline-') && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const kind = navigationKind(url);
  if (request.mode === 'navigate' && kind) {
    event.respondWith((async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(request, { signal: controller.signal });
        if ([403, 404, 410].includes(response.status)) event.waitUntil(forget(request));
        else if (response.ok && !response.redirected && /text\/html/i.test(response.headers.get('content-type') || '')) event.waitUntil(remember(request, response.clone(), kind));
        return response;
      } catch { return offlineResponse(request); }
      finally { clearTimeout(timer); }
    })());
  } else if (asset(url)) {
    const refresh = fetch(request).then(response => { if ([403, 404, 410].includes(response.status)) event.waitUntil(forget(request)); else if (response.ok) event.waitUntil(remember(request, response.clone(), 'asset')); return response; });
    event.waitUntil(refresh.catch(() => {}));
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || refresh));
  }
});
