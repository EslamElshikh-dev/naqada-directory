export type AnalyticsData = Record<string, string | number | boolean>;

type AnalyticsWindow = Window & {
  va?: (command: 'event', payload: { name: string; data?: AnalyticsData }) => void;
};

type IntakeEventType =
  | 'search'
  | 'zero_results'
  | 'listing_call'
  | 'listing_whatsapp'
  | 'listing_map'
  | 'listing_share'
  | 'contribution_prepare'
  | 'contribution_copy'
  | 'contribution_share'
  | 'contribution_contact';

type ContributionPayload = {
  requestType: 'add' | 'correction' | 'missing';
  name: string;
  category?: string;
  locality?: string;
  details?: string;
  sourceUrl?: string;
  contact?: string;
  listingSlug?: string;
  formStartedAt: number;
  website?: string;
};

const INTAKE_URL = 'https://ceyjfguoomdlrtsujskj.supabase.co/functions/v1/directory-intake';
const EVENT_MAP: Record<string, IntakeEventType | undefined> = {
  'Directory Search': 'search',
  'Directory Zero Results': 'zero_results',
  'Listing Call': 'listing_call',
  'Listing WhatsApp': 'listing_whatsapp',
  'Listing Map Opened': 'listing_map',
  'Listing Link Copied': 'listing_share',
  'Listing Shared': 'listing_share',
  'Contribution Prepared': 'contribution_prepare',
  'Contribution Copied': 'contribution_copy',
  'Contribution Shared': 'contribution_share',
  'Contribution Contact Opened': 'contribution_contact',
};

function dimension(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'all' || trimmed === 'unspecified') return undefined;
  return trimmed.slice(0, 160);
}

function contributionType(value: unknown) {
  return value === 'add' || value === 'correction' || value === 'missing' ? value : undefined;
}

function sessionHint() {
  if (typeof window === 'undefined') return undefined;
  try {
    const key = 'naqada_directory_session';
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(key, value);
    return value;
  } catch {
    return undefined;
  }
}

async function postIntake(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    await fetch(INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Telemetry must never interrupt the user experience.
  }
}

export function trackEvent(name: string, data?: AnalyticsData) {
  if (typeof window === 'undefined') return;

  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.va?.('event', { name, data });

  const eventType = EVENT_MAP[name];
  if (!eventType) return;

  const safeQuery = typeof data?.query === 'string' ? privacySafeSearchTerm(data.query) : '';
  void postIntake({
    action: 'event',
    eventType,
    queryText: safeQuery || undefined,
    resultCount: typeof data?.results === 'number' ? data.results : undefined,
    category: dimension(data?.category),
    locality: dimension(data?.locality),
    listingSlug: dimension(data?.listingSlug),
    requestType: contributionType(data?.type),
    sessionHint: sessionHint(),
  });
}

export async function submitContribution(payload: ContributionPayload) {
  try {
    const response = await fetch(INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'contribution', sessionHint: sessionHint(), ...payload }),
    });
    const body = await response.json().catch(() => ({})) as { ok?: boolean; id?: string; error?: string };
    return {
      ok: response.ok && body.ok === true,
      id: body.id,
      error: body.error || (response.ok ? undefined : 'request_failed'),
      status: response.status,
    };
  } catch {
    return { ok: false, error: 'network_error', status: 0 };
  }
}

export function privacySafeSearchTerm(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/\S+@\S+\.\S+/.test(trimmed)) return '';
  if (/(?:\+?\d[\d\s().-]{6,}\d)/.test(trimmed)) return '';
  return trimmed.replace(/\s+/g, ' ').slice(0, 70);
}
