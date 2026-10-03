import { createClient } from 'npm:@supabase/supabase-js@2';
import { LOCAL_PLACES, LUXOR_PLACES } from './places.ts';
import { readFacebookSearch } from './facebook-search.ts';
import { scanJobsArab } from './jobs-arab.ts';
import { scanEgyptJobs } from './egypt-jobs.ts';
import { scanEgyptJobBank } from './egypt-job-bank.ts';
import { scanForasna } from './forasna.ts';
import { scanTanqeeb } from './tanqeeb.ts';
import { scanEmployerJobs } from './employer-jobs.ts';
import { dedupeJobs } from './job-dedupe.ts';
import { readFeed } from './rss.ts';
import { FEEDS, PUBLIC_FACEBOOK_SEARCHES, PUBLIC_SOCIAL_FEEDS } from './source-catalog.ts';
import { readPublicTelegram } from './telegram.ts';

const PROD_ORIGIN = 'https://naqada-directory.vercel.app';
const PUBLIC_KEY = 'sb_publishable_QsT7jYGw7sWx0v6Vbg2Vjw_-uFV8wMk';

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
    const scanRss = async (feed: { name: string; url: string }, facebook = false) => {
      try {
        const reply = await fetch(feed.url, { signal: AbortSignal.timeout(5500), headers: { 'User-Agent': 'NaqadaDirectory/1.0 (+https://naqada-directory.vercel.app/jobs)' } });
        if (!reply.ok) return { ok: false, jobs: [] };
        const xml = await reply.text();
        if (!xml.includes('<rss') && !xml.includes('<item')) return { ok: false, jobs: [] };
        return { ok: true, jobs: facebook ? readFacebookSearch(xml.slice(0, 350_000)) : readFeed(xml.slice(0, 350_000), feed.name) };
      } catch { return { ok: false, jobs: [] }; }
    };
    const scanSocial = async (page: { name: string; url: string; channel: string }) => {
      try {
        const reply = await fetch(page.url, { signal: AbortSignal.timeout(5500) });
        if (!reply.ok) return { ok: false, jobs: [] };
        const html = await reply.text();
        if (!html.includes('tgme_widget_message')) return { ok: false, jobs: [] };
        return { ok: true, jobs: readPublicTelegram(html.slice(0, 550_000), page.name, page.channel) };
      } catch { return { ok: false, jobs: [] }; }
    };
    const sources = [
      // Prefer a verified employer listing when another source carries the same job.
      { name: 'موقع التوظيف الرسمي · Coptic Orphans', run: scanEmployerJobs },
      ...FEEDS.map((feed) => ({ name: feed.name, run: () => scanRss(feed) })),
      ...PUBLIC_FACEBOOK_SEARCHES.map((feed) => ({ name: feed.name, run: () => scanRss(feed, true) })),
      ...PUBLIC_SOCIAL_FEEDS.map((page) => ({ name: page.name, run: () => scanSocial(page) })),
      { name: 'وظائف العرب', run: scanJobsArab },
      { name: 'إعلانات الوظائف الحكومية', run: scanEgyptJobs },
      { name: 'بنك الوظائف المصري', run: scanEgyptJobBank },
      { name: 'فرصنا', run: scanForasna },
      { name: 'تنقيب', run: scanTanqeeb },
    ];
    const scans = await Promise.all(sources.map(async (source) => ({ ...await source.run(), name: source.name })));
    const successfulFeeds = scans.filter((scan) => scan.ok).length;
    if (!successfulFeeds) return response(503, { ok: false, error: 'sources_unavailable' }, origin);
    const { data: recent, error: readError } = await db.from('naqada_jobs')
      .select('source_url,title,organization,locality,source_published_at')
      .eq('origin', 'external').gte('source_published_at', new Date(Date.now() - 31 * 86_400_000).toISOString()).limit(1000);
    if (readError) return response(503, { ok: false, error: 'deduplication_unavailable' }, origin);
    // Include closed/moderated adverts too: a new aggregator URL must not
    // resurrect a job the owner or moderators have already removed.
    const existing = (recent || []).map((job: { source_url: string | null; title: string; organization: string | null; locality: string; source_published_at: string | null }) => ({
      ...job, source_url: job.source_url || '', organization: job.organization || '', source_published_at: job.source_published_at || '',
    }));
    const matched = scans.flatMap((scan) => scan.jobs);
    const jobs = dedupeJobs(matched, existing);
    const { data: stored, error: insertError } = jobs.length
      ? await db.from('naqada_jobs').upsert(jobs, { onConflict: 'source_url', ignoreDuplicates: true }).select('id')
      : { data: [], error: null };
    if (insertError) return response(503, { ok: false, error: 'save_failed' }, origin);
    const added = stored?.length || 0;
    const { error: stateError } = await db.from('naqada_job_feed_state').update({ last_checked_at: new Date().toISOString(), successful_feeds: successfulFeeds, latest_added: added }).eq('id', 1);
    if (stateError) return response(503, { ok: false, error: 'state_unavailable' }, origin);
    return response(200, { ok: true, successfulFeeds, totalSources: scans.length, matched: matched.length, processed: added,
      sources: scans.map((scan) => ({ name: scan.name, ok: scan.ok, matched: scan.jobs.length })),
    }, origin);
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
  const chosenLocality = plain(body.locality, 120);
  const otherLocality = plain(body.otherLocality, 80);
  const customLuxorPlace = chosenLocality === 'other-luxor' && otherLocality.length >= 3 && /^[\u0621-\u064a\s\-]{3,80}$/.test(otherLocality);
  const locality = customLuxorPlace ? otherLocality : chosenLocality;
  const field = plain(body.field, 100);
  const description = plain(body.description, 2000);
  const experience = plain(body.experience, 600);
  const workType = ['full-time', 'part-time', 'temporary', 'flexible'].includes(body.workType) ? body.workType : null;
  const contactKind = ['phone', 'whatsapp', 'email', 'link'].includes(body.contactKind) ? body.contactKind : null;
  const contact = plain(body.contactValue, 1000);
  const consent = body.contactConsent === true;
  const inNaqada = (LOCAL_PLACES as readonly string[]).includes(locality);
  const inLuxor = (LUXOR_PLACES as readonly string[]).includes(locality) || customLuxorPlace;
  const hasPlace = inNaqada || inLuxor;
  if (!kind || title.length < 3 || description.length < 20 || !hasPlace || field.length < 2 || !contactKind || (kind === 'seeker' && !consent)) return response(400, { ok: false, error: 'invalid_fields' }, origin);
  if (kind === 'offer' && organization.length < 2) return response(400, { ok: false, error: 'organization_required' }, origin);
  if (contactKind === 'link' && !safeLink(contact) || contactKind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || ['phone', 'whatsapp'].includes(contactKind) && contact.replace(/\D/g, '').length < 10) return response(400, { ok: false, error: 'invalid_contact' }, origin);
  const { data, error } = await db.from('naqada_jobs').insert({ kind, origin: 'community', title, organization: organization || null, locality, governorate: inLuxor ? 'الأقصر' : 'قنا', field, description, experience: experience || null, work_type: workType, contact_kind: contactKind, contact_value: contact, contact_consent: consent }).select('id').single();
  if (error) return response(503, { ok: false, error: 'save_failed' }, origin);
  return response(201, { ok: true, id: data.id, review: 'pending' }, origin);
});
