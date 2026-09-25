import { createClient } from 'npm:@supabase/supabase-js@2';
import { LOCAL_PLACES } from './places.ts';

const PROD_ORIGIN = 'https://naqada-directory.vercel.app';
const PUBLIC_KEY = 'sb_publishable_QsT7jYGw7sWx0v6Vbg2Vjw_-uFV8wMk';
const FEEDS = [
  { name: 'أخبار Google', url: 'https://news.google.com/rss/search?q=' + encodeURIComponent('وظائف نقادة قنا when:14d') + '&hl=ar&gl=EG&ceid=EG:ar' },
  { name: 'أخبار Bing', url: 'https://www.bing.com/news/search?q=' + encodeURIComponent('وظائف نقادة قنا') + '&format=rss&setlang=ar-eg&cc=eg' },
];
const PUBLIC_SOCIAL_FEEDS = [
  { name: 'وظائف صعيد مصر · تيليجرام', url: 'https://t.me/s/QenaLuxorJobs' },
];

function allowedOrigin(origin: string | null) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return origin === PROD_ORIGIN || (url.protocol === 'https:' && url.hostname.endsWith('.vercel.app') && url.hostname.startsWith('naqada-directory-'));
  } catch { return false; }
}

function response(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin! : PROD_ORIGIN,
    'Access-Control-Allow-Headers': 'content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  } });
}

function plain(value: unknown, limit: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function safeLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw) => {
    const code = raw.startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity] || entity);
}

function xmlField(xml: string, tag: string) {
  return decodeXml(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml)?.[1] || '').trim();
}

function norm(value: string) {
  return value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064b-\u065f\u0670]/g, '');
}

function readFeed(xml: string, feedName: string) {
  const now = Date.now();
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 45).flatMap((match) => {
    const item = match[1];
    const title = plain(decodeXml(xmlField(item, 'title')), 140);
    const snippet = plain(decodeXml(xmlField(item, 'description')), 420);
    const url = safeLink(xmlField(item, 'link'));
    const publishedAt = new Date(xmlField(item, 'pubDate'));
    const age = now - publishedAt.getTime();
    if (!url || title.length < 3 || !Number.isFinite(age) || age < -86_400_000 || age > 14 * 86_400_000) return [];
    const combined = norm(`${title} ${snippet}`);
    if (!/(وظيف|توظيف|مطلوب|تعيين|فرص عمل|فرصه عمل|شاغر|انضم)/.test(combined)) return [];
    if (/(دوره تدريبيه|منحه دراسيه|وظائف بكل المحافظات|نتائج التقديم|نتيجه مسابقه)/.test(combined)) return [];
    const place = [...LOCAL_PLACES].sort((a, b) => b.length - a.length).find((locality) => combined.includes(norm(locality)));
    if (!place || (place !== 'نقادة' && !/(نقاده|قنا)/.test(combined))) return [];
    const source = plain(xmlField(item, 'source'), 120) || feedName;
    const description = snippet.length >= 20 ? snippet : `فرصة عمل منشورة من ${source}. افتح المصدر للتأكد من الشروط وطريقة التقديم واستمرار الإعلان.`;
    return [{ kind: 'offer', origin: 'external', status: 'published', title,
      organization: source, locality: place === 'نقادة' ? 'مدينة نقادة' : place, field: 'وظائف محلية', description,
      contact_kind: 'link', contact_value: url, contact_consent: false,
      source_name: source, source_url: url, source_published_at: publishedAt.toISOString(),
      published_at: publishedAt.toISOString(), expires_at: new Date(publishedAt.getTime() + 14 * 86_400_000).toISOString() }];
  });
}

function readPublicTelegram(html: string, name: string) {
  const now = Date.now();
  return [...html.matchAll(/<div class="tgme_widget_message_wrap[^\"]*"[^>]*>([\s\S]*?)(?=<div class="tgme_widget_message_wrap|$)/gi)].slice(-45).flatMap((match) => {
    const block = match[1];
    const post = /data-post="(QenaLuxorJobs\/\d+)"/.exec(block)?.[1];
    const publishedAt = new Date(/<time[^>]+datetime="([^"]+)"/.exec(block)?.[1] || '');
    const age = now - publishedAt.getTime();
    const content = /<div class="tgme_widget_message_text[^\"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1] || '';
    const message = plain(decodeXml(content.replace(/<br\s*\/?\s*>/gi, ' · ')), 1200);
    const normalized = norm(message);
    const place = [...LOCAL_PLACES].sort((a, b) => b.length - a.length).find((locality) => normalized.includes(norm(locality)));
    if (!post || !place || !/(نقاده|قنا)/.test(normalized) || !/(وظيف|توظيف|مطلوب|تعيين|فرص عمل|شاغر)/.test(normalized) || !Number.isFinite(age) || age < -86_400_000 || age > 14 * 86_400_000) return [];
    const headline = message.split(/[.!؟·\n]/).map((part) => part.trim()).find((part) => /(مطلوب|وظيف|فرص عمل|تعيين)/.test(norm(part))) || 'فرصة عمل في نقادة';
    const sourceUrl = `https://t.me/${post}`;
    return [{ kind: 'offer', origin: 'external', status: 'published', title: headline.slice(0, 140), organization: name,
      locality: place === 'نقادة' ? 'مدينة نقادة' : place, field: 'وظائف محلية',
      description: message.slice(0, 1200), contact_kind: 'link', contact_value: sourceUrl, contact_consent: false,
      source_name: name, source_url: sourceUrl, source_published_at: publishedAt.toISOString(),
      published_at: publishedAt.toISOString(), expires_at: new Date(publishedAt.getTime() + 14 * 86_400_000).toISOString() }];
  });
}

async function hashIp(ip: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:job-intake:${new Date().toISOString().slice(0, 10)}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return allowedOrigin(origin) ? new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin!, 'Access-Control-Allow-Headers': 'content-type, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } }) : response(403, { ok: false }, origin);
  if (req.method !== 'POST') return response(405, { ok: false }, origin);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return response(503, { ok: false, error: 'unavailable' }, origin);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  if (new URL(req.url).searchParams.get('action') === 'refresh') {
    // The key is public; the database lock limits network work to one run per 25 minutes.
    // This endpoint cannot accept or publish user-supplied content.
    if (origin || req.headers.get('apikey') !== PUBLIC_KEY) return response(403, { ok: false }, origin);
    const { data: claimed, error: claimError } = await db.rpc('claim_naqada_job_refresh');
    if (claimError) return response(503, { ok: false, error: 'lock_unavailable' }, origin);
    if (!claimed) return response(200, { ok: true, skipped: true }, origin);
    let successfulFeeds = 0;
    let added = 0;
    for (const feed of FEEDS) {
      try {
        const reply = await fetch(feed.url, { signal: AbortSignal.timeout(8500), headers: { 'User-Agent': 'NaqadaDirectory/1.0 (+https://naqada-directory.vercel.app/jobs)' } });
        if (!reply.ok) continue;
        const xml = await reply.text();
        if (!xml.includes('<rss') && !xml.includes('<item')) continue;
        successfulFeeds++;
        for (const job of readFeed(xml.slice(0, 350_000), feed.name)) {
          const { error } = await db.from('naqada_jobs').upsert(job, { onConflict: 'source_url', ignoreDuplicates: true });
          if (!error) added++;
        }
      } catch { /* A source can fail independently; other sources still run. */ }
    }
    for (const page of PUBLIC_SOCIAL_FEEDS) {
      try {
        const reply = await fetch(page.url, { signal: AbortSignal.timeout(8500) });
        if (!reply.ok) continue;
        const html = await reply.text();
        if (!html.includes('tgme_widget_message')) continue;
        successfulFeeds++;
        for (const job of readPublicTelegram(html.slice(0, 550_000), page.name)) {
          const { error } = await db.from('naqada_jobs').upsert(job, { onConflict: 'source_url', ignoreDuplicates: true });
          if (!error) added++;
        }
      } catch { /* Social channels may be unavailable for some scheduled scans. */ }
    }
    await db.from('naqada_job_feed_state').update({ last_checked_at: new Date().toISOString(), successful_feeds: successfulFeeds, latest_added: added }).eq('id', 1);
    return response(200, { ok: true, successfulFeeds, processed: added }, origin);
  }

  if (!allowedOrigin(origin)) return response(403, { ok: false, error: 'origin_not_allowed' }, origin);
  if (!(req.headers.get('content-type') || '').includes('application/json')) return response(415, { ok: false }, origin);
  if (Number(req.headers.get('content-length') || 0) > 12_000) return response(413, { ok: false }, origin);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return response(400, { ok: false }, origin);
  if (body.website) return response(200, { ok: true }, origin);
  const startedAt = Number(body.formStartedAt);
  const age = Date.now() - startedAt;
  if (!Number.isFinite(age) || age < 1000 || age > 7_200_000) return response(400, { ok: false, error: 'form_timing' }, origin);
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const { data: allowed, error: rateError } = await db.rpc('consume_public_rate_limit', { p_endpoint: 'jobs', p_ip_hash: await hashIp(ip, serviceKey), p_limit: 5 });
  if (rateError) return response(503, { ok: false, error: 'rate_unavailable' }, origin);
  if (!allowed) return response(429, { ok: false, error: 'rate_limited' }, origin);

  const kind = body.kind === 'seeker' ? 'seeker' : body.kind === 'offer' ? 'offer' : null;
  const title = plain(body.title, 140);
  const organization = plain(body.organization, 120);
  const locality = plain(body.locality, 120);
  const field = plain(body.field, 100);
  const description = plain(body.description, 2000);
  const experience = plain(body.experience, 600);
  const workType = ['full-time', 'part-time', 'temporary', 'flexible'].includes(body.workType) ? body.workType : null;
  const contactKind = ['phone', 'whatsapp', 'email', 'link'].includes(body.contactKind) ? body.contactKind : null;
  const contact = plain(body.contactValue, 1000);
  const consent = body.contactConsent === true;
  const hasPlace = (LOCAL_PLACES as readonly string[]).includes(locality);
  if (!kind || title.length < 3 || description.length < 20 || !hasPlace || field.length < 2 || !contactKind || (kind === 'seeker' && !consent)) return response(400, { ok: false, error: 'invalid_fields' }, origin);
  if (kind === 'offer' && organization.length < 2) return response(400, { ok: false, error: 'organization_required' }, origin);
  if (contactKind === 'link' && !safeLink(contact) || contactKind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || ['phone', 'whatsapp'].includes(contactKind) && contact.replace(/\D/g, '').length < 10) return response(400, { ok: false, error: 'invalid_contact' }, origin);
  const { data, error } = await db.from('naqada_jobs').insert({ kind, origin: 'community', title, organization: organization || null, locality, field, description, experience: experience || null, work_type: workType, contact_kind: contactKind, contact_value: contact, contact_consent: consent }).select('id').single();
  if (error) return response(503, { ok: false, error: 'save_failed' }, origin);
  return response(201, { ok: true, id: data.id, review: 'pending' }, origin);
});
