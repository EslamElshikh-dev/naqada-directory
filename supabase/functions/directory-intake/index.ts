import { createClient } from "npm:@supabase/supabase-js@2";

const PROD_ORIGIN = "https://naqada-directory.vercel.app";
const allowedEventTypes = new Set([
  "search",
  "zero_results",
  "listing_call",
  "listing_whatsapp",
  "listing_map",
  "listing_share",
  "contribution_prepare",
  "contribution_copy",
  "contribution_share",
  "contribution_contact",
]);
const allowedRequestTypes = new Set(["add", "correction", "missing"]);

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (origin === PROD_ORIGIN) return true;
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app") && url.hostname.startsWith("naqada-directory-");
  } catch {
    return false;
  }
}

function cors(origin: string | null) {
  const allowed = isAllowedOrigin(origin) ? origin! : PROD_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\u0000/g, "").trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

function safeUrl(value: unknown): string | null {
  const raw = clean(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function looksSensitiveQuery(value: string | null) {
  if (!value) return false;
  if (value.includes("@")) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

async function hashIp(ip: string, secret: string) {
  const day = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${secret}:${day}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashRatingIdentity(ip: string, secret: string) {
  const bytes = new TextEncoder().encode(`${secret}:listing-rating:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validListingSlug(value: string | null) {
  return Boolean(value && value.length >= 2 && /^[\p{L}\p{N}-]+$/u.test(value));
}

function summarizeRatings(rows: Array<{ score: number }>) {
  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let total = 0;
  for (const row of rows) {
    const score = Math.trunc(Number(row.score));
    if (score < 1 || score > 5) continue;
    distribution[String(score)] += 1;
    total += score;
  }
  const count = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  return { average: count ? Number((total / count).toFixed(1)) : 0, count, distribution };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return json(403, { ok: false }, origin);
    return new Response(null, { status: 204, headers: cors(origin) });
  }

  if (req.method !== "GET" && req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, origin);
  if (!isAllowedOrigin(origin)) return json(403, { ok: false, error: "origin_not_allowed" }, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json(503, { ok: false, error: "service_unavailable" }, origin);
  const db = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("action") !== "rating") return json(400, { ok: false, error: "invalid_action" }, origin);
    const listingSlug = clean(url.searchParams.get("listingSlug"), 220);
    if (!validListingSlug(listingSlug)) return json(400, { ok: false, error: "invalid_listing" }, origin);

    const { data, error } = await db.from("directory_ratings").select("score").eq("listing_slug", listingSlug!).limit(5000);
    if (error) return json(500, { ok: false, error: "rating_lookup_failed" }, origin);
    return json(200, { ok: true, summary: summarizeRatings(data || []) }, origin);
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return json(415, { ok: false, error: "json_required" }, origin);
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 20_000) return json(413, { ok: false, error: "payload_too_large" }, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, origin);
  }

  if (clean(body.website, 200)) return json(200, { ok: true }, origin);

  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
  const ipHash = await hashIp(ip, serviceRole);
  const action = body.action === "event" ? "event" : body.action === "contribution" ? "contribution" : body.action === "rating" ? "rating" : null;
  if (!action) return json(400, { ok: false, error: "invalid_action" }, origin);

  const rateLimit = action === "contribution" ? 8 : action === "rating" ? 20 : 240;
  const { data: allowed, error: rateError } = await db.rpc("consume_public_rate_limit", {
    p_endpoint: action,
    p_ip_hash: ipHash,
    p_limit: rateLimit,
  });
  if (rateError) return json(503, { ok: false, error: "rate_limit_unavailable" }, origin);
  if (!allowed) return json(429, { ok: false, error: "rate_limited" }, origin);

  if (action === "rating") {
    const listingSlug = clean(body.listingSlug, 220);
    const score = Number(body.score);
    if (!validListingSlug(listingSlug) || !Number.isInteger(score) || score < 1 || score > 5) {
      return json(400, { ok: false, error: "invalid_rating" }, origin);
    }

    const raterHash = await hashRatingIdentity(ip, serviceRole);
    const { error: upsertError } = await db.from("directory_ratings").upsert({
      listing_slug: listingSlug,
      score,
      rater_hash: raterHash,
      updated_at: new Date().toISOString(),
    }, { onConflict: "listing_slug,rater_hash" });
    if (upsertError) return json(500, { ok: false, error: "rating_save_failed" }, origin);

    const { data, error } = await db.from("directory_ratings").select("score").eq("listing_slug", listingSlug!).limit(5000);
    if (error) return json(500, { ok: false, error: "rating_lookup_failed" }, origin);
    return json(200, { ok: true, summary: summarizeRatings(data || []) }, origin);
  }

  if (action === "contribution") {
    const startedAt = Number(body.formStartedAt || 0);
    const age = Date.now() - startedAt;
    if (!Number.isFinite(startedAt) || age < 1200 || age > 7_200_000) {
      return json(400, { ok: false, error: "invalid_form_timing" }, origin);
    }

    const requestType = clean(body.requestType, 20);
    const name = clean(body.name, 160);
    if (!requestType || !allowedRequestTypes.has(requestType) || !name || name.length < 2) {
      return json(400, { ok: false, error: "missing_required_fields" }, origin);
    }

    const row = {
      request_type: requestType,
      name,
      category: clean(body.category, 120),
      locality: clean(body.locality, 160),
      details: clean(body.details, 2000),
      source_url: safeUrl(body.sourceUrl),
      contact: clean(body.contact, 320),
      listing_slug: clean(body.listingSlug, 220),
      submitted_via: "web",
    };

    const { data, error } = await db.from("directory_contributions").insert(row).select("id").single();
    if (error) return json(500, { ok: false, error: "insert_failed" }, origin);

    await db.from("directory_events").insert({
      event_type: "contribution_submitted",
      request_type: requestType,
      category: row.category,
      locality: row.locality,
      listing_slug: row.listing_slug,
      session_hint: clean(body.sessionHint, 80),
    });

    return json(201, { ok: true, id: data.id }, origin);
  }

  const eventType = clean(body.eventType, 40);
  if (!eventType || !allowedEventTypes.has(eventType)) return json(400, { ok: false, error: "invalid_event" }, origin);

  const requestType = clean(body.requestType, 20);
  if (requestType && !allowedRequestTypes.has(requestType)) return json(400, { ok: false, error: "invalid_request_type" }, origin);

  let queryText = clean(body.queryText, 160);
  if (looksSensitiveQuery(queryText)) queryText = null;
  const rawCount = Number(body.resultCount);
  const resultCount = Number.isFinite(rawCount) ? Math.max(0, Math.min(10_000, Math.trunc(rawCount))) : null;

  const { error } = await db.from("directory_events").insert({
    event_type: eventType,
    query_text: queryText,
    result_count: resultCount,
    category: clean(body.category, 120),
    locality: clean(body.locality, 160),
    listing_slug: clean(body.listingSlug, 220),
    request_type: requestType,
    session_hint: clean(body.sessionHint, 80),
  });
  if (error) return json(500, { ok: false, error: "insert_failed" }, origin);
  return json(202, { ok: true }, origin);
});
