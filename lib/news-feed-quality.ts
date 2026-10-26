import type { ExternalNewsItem } from './news';
import { normalizeArabic, siteConfig } from './site';

export const LATEST_NEWS_MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// The archive is the published snapshot also used by detail pages. Keep its date
// on live previews while allowing newly discovered images and descriptions.
export function reconcileNewsCopies(live: readonly ExternalNewsItem[], archived: readonly ExternalNewsItem[]) {
  const snapshots = new Map(archived.map(item => [articleKey(item), item]));
  const previews = live.map(item => {
    const snapshot = snapshots.get(articleKey(item));
    return snapshot && Number.isFinite(Date.parse(snapshot.publishedAt))
      ? { ...item, publishedAt: snapshot.publishedAt }
      : item;
  });
  return [...previews, ...archived];
}

function eventTokens(item: ExternalNewsItem) {
  const stop = new Set(['في', 'من', 'علي', 'الي', 'عن', 'مع', 'بعد', 'قبل', 'خلال', 'ضمن', 'اليوم', 'صور', 'فيديو']);
  return new Set(normalizeArabic(item.title).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(word => (word.length > 2 || /\p{N}/u.test(word)) && !stop.has(word)));
}

function sameEvent(left: ExternalNewsItem, right: ExternalNewsItem) {
  if (left.isOriginal || right.isOriginal || left.isNaqada !== right.isNaqada || left.category !== right.category) return false;
  if (publisherKey(left) === publisherKey(right)) return false;
  const gap = Math.abs(Date.parse(left.publishedAt) - Date.parse(right.publishedAt));
  if (!Number.isFinite(gap) || gap > DAY_MS) return false;
  // Similar accident/crime templates must never be silently collapsed.
  if (/حادث|مصرع|وفا[ةه]|اصاب|اصيب|قتل|غرق|حريق/.test(normalizeArabic(`${left.title} ${right.title}`))) return false;
  const a = eventTokens(left), b = eventTokens(right);
  if (Math.min(a.size, b.size) < 5) return false;
  const numbers = (words: Set<string>) => [...words].filter(word => /\p{N}/u.test(word)).sort().join(' ');
  if (numbers(a) !== numbers(b)) return false;
  const shared = [...a].filter(word => b.has(word)).length;
  // Only the same meaningful headline is grouped; different names/places stay separate.
  return shared === a.size && shared === b.size;
}

export function groupNewsEvents(items: readonly ExternalNewsItem[]) {
  const groups: Array<{ item: ExternalNewsItem; related: ExternalNewsItem[] }> = [];
  for (const item of items) {
    const group = groups.find(group => sameEvent(group.item, item));
    if (group) group.related.push(item);
    else groups.push({ item, related: [] });
  }
  return groups;
}

function articleKey(item: ExternalNewsItem) {
  if (item.isOriginal) return `original:${item.id}`;
  try {
    const url = new URL(item.url, siteConfig.url);
    const host = url.hostname.replace(/^(?:(?:www|amp|m)\.)+/, '');
    const path = url.pathname.replace(/\/amp(?=\/|$)/gi, '').replace(/\.amp$/i, '').replace(/\/+$/, '');
    // Publisher IDs survive title changes and alternate mobile/AMP URLs.
    const publisherId = ['elbalad.news', 'cairo24.com'].includes(host)
      ? path.match(/^\/(\d+)(?:\/|$)/)?.[1]
      : host === 'elwatannews.com' ? path.match(/^\/news\/details\/(\d+)(?:\/|$)/)?.[1] : null;
    if (publisherId) return `${host}:${publisherId}`;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|amp|output)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return `${host}${path}${url.searchParams.size ? `?${url.searchParams}` : ''}`;
  } catch {
    return item.url;
  }
}

function publisherKey(item: ExternalNewsItem) {
  try { return new URL(item.sourceUrl, siteConfig.url).hostname.replace(/^www\./, ''); }
  catch { return normalizeArabic(item.source); }
}

function summaryTokens(item: ExternalNewsItem) {
  return new Set(normalizeArabic(item.description).replace(/\s+لاعلي.*$/u, '').split(' ').filter(Boolean));
}

function samePublisherSummary(left: ExternalNewsItem, right: ExternalNewsItem) {
  if (left.isOriginal || right.isOriginal || publisherKey(left) !== publisherKey(right)) return false;
  const gap = Math.abs(Date.parse(left.publishedAt) - Date.parse(right.publishedAt));
  if (!Number.isFinite(gap) || gap > 2 * DAY_MS) return false;
  const a = summaryTokens(left);
  const b = summaryTokens(right);
  if (Math.min(a.size, b.size) < 12) return false;
  // Repeated event templates with different counts must remain separate stories.
  const numbers = (tokens: Set<string>) => [...tokens].filter((token) => /\p{N}/u.test(token)).sort().join(' ');
  if (numbers(a) !== numbers(b)) return false;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection) >= 0.94;
}

export function deduplicateNews(items: readonly ExternalNewsItem[]) {
  const urls = new Set<string>();
  const titles = new Map<string, ExternalNewsItem[]>();
  const result: ExternalNewsItem[] = [];
  for (const item of items) {
    const urlKey = articleKey(item);
    const titleKey = `${publisherKey(item)}:${normalizeArabic(item.title)}`;
    const repeatedTitle = titles.get(titleKey)?.some((previous) => {
      const gap = Math.abs(Date.parse(previous.publishedAt) - Date.parse(item.publishedAt));
      return Number.isFinite(gap) && gap <= 2 * DAY_MS;
    });
    if (urls.has(urlKey) || repeatedTitle || result.some((previous) => samePublisherSummary(previous, item))) continue;
    urls.add(urlKey);
    titles.set(titleKey, [...titles.get(titleKey) || [], item]);
    result.push(item);
  }
  return result.sort((left, right) => {
    if (left.isNaqada !== right.isNaqada) return left.isNaqada ? -1 : 1;
    return (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0);
  });
}

export function selectLatestNews(items: readonly ExternalNewsItem[], now = Date.now(), limit = 48) {
  const cutoff = now - LATEST_NEWS_MAX_AGE_DAYS * DAY_MS;
  return deduplicateNews(items.filter((item) => {
    const published = Date.parse(item.publishedAt);
    return Number.isFinite(published) && published >= cutoff && published <= now + 5 * 60 * 1000;
  })).slice(0, limit);
}
