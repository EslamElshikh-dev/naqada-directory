import type { ExternalNewsItem } from './news';
import { normalizeArabic, siteConfig } from './site';

export const LATEST_NEWS_MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

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
