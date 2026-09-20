import { cache } from 'react';
import { normalizeArabic } from './site';

export type NewsCategory = 'محليات' | 'خدمات' | 'تعليم' | 'صحة' | 'مجتمع';

export type ExternalNewsItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  imageUrl: string | null;
  imageAlt: string;
  category: NewsCategory;
  isNaqada: boolean;
  isOfficial: boolean;
};

export type NewsFeedResult = {
  items: ExternalNewsItem[];
  checkedAt: string;
  successfulFeeds: number;
  totalFeeds: number;
};

type FeedDefinition = {
  name: string;
  url: string;
};

type PublisherDefinition = {
  name: string;
  homepage: string;
  official?: boolean;
};

const FEED_REVALIDATE_SECONDS = 15 * 60;
const ARTICLE_REVALIDATE_SECONDS = 6 * 60 * 60;
const FEED_TIMEOUT_MS = 7_000;
const ARTICLE_TIMEOUT_MS = 5_000;
const MAX_ITEMS_TO_ENRICH = 14;

const NEWS_FEEDS: FeedDefinition[] = [
  {
    name: 'بحث الأخبار المحلي',
    url: 'https://www.bing.com/news/search?q=%28%22%D9%86%D9%82%D8%A7%D8%AF%D8%A9%22+OR+%22%D9%85%D8%B1%D9%83%D8%B2+%D9%86%D9%82%D8%A7%D8%AF%D8%A9%22+OR+%22%D9%85%D8%AD%D8%A7%D9%81%D8%B8%D8%A9+%D9%82%D9%86%D8%A7%22%29&format=rss&setlang=ar-eg&cc=eg',
  },
  {
    name: 'اليوم السابع',
    url: 'https://www.youm7.com/rss/SectionRss?SectionID=296',
  },
  {
    name: 'المصري اليوم',
    url: 'https://www.almasryalyoum.com/rss/rssfeed?homePage=true',
  },
  {
    name: 'مصراوي',
    url: 'https://www.masrawy.com/feeds/rssfeedlist?fullfeed=1',
  },
];

const PUBLISHERS: Record<string, PublisherDefinition> = {
  'qena.gov.eg': { name: 'البوابة الرسمية لمحافظة قنا', homepage: 'https://www.qena.gov.eg/', official: true },
  'youm7.com': { name: 'اليوم السابع', homepage: 'https://www.youm7.com/' },
  'gate.ahram.org.eg': { name: 'بوابة الأهرام', homepage: 'https://gate.ahram.org.eg/' },
  'elwatannews.com': { name: 'الوطن', homepage: 'https://www.elwatannews.com/' },
  'almasryalyoum.com': { name: 'المصري اليوم', homepage: 'https://www.almasryalyoum.com/' },
  'akhbarelyom.com': { name: 'بوابة أخبار اليوم', homepage: 'https://akhbarelyom.com/' },
  'masrawy.com': { name: 'مصراوي', homepage: 'https://www.masrawy.com/' },
  'cairo24.com': { name: 'القاهرة 24', homepage: 'https://www.cairo24.com/' },
};

const TRUSTED_IMAGE_HOSTS = new Set([
  'img.youm7.com',
  'media.elwatannews.com',
  'mediaaws.almasryalyoum.com',
  'media.gemini.media',
  'images.akhbarelyom.com',
  'img.ahlmasrnews.com',
  'www.cairo24.com',
  'cairo24.com',
  'gate.ahram.org.eg',
  'www.youm7.com',
  'www.almasryalyoum.com',
  'www.elwatannews.com',
  'akhbarelyom.com',
  'www.masrawy.com',
]);

export const newsSourceDirectory = [
  { name: 'محافظة قنا', label: 'مصدر رسمي', href: 'https://www.qena.gov.eg/' },
  { name: 'بوابة الأهرام', label: 'نتائج أخبار قنا', href: 'https://gate.ahram.org.eg/Search/%D9%82%D9%86%D8%A7.aspx' },
  { name: 'الوطن', label: 'صفحة قنا', href: 'https://www.elwatannews.com/section/149' },
  { name: 'اليوم السابع', label: 'أخبار المحافظات', href: 'https://www.youm7.com/Section/%D8%A3%D8%AE%D8%A8%D8%A7%D8%B1-%D8%A7%D9%84%D9%85%D8%AD%D8%A7%D9%81%D8%B8%D8%A7%D8%AA/296/1' },
  { name: 'المصري اليوم', label: 'أخبار مصر', href: 'https://www.almasryalyoum.com/' },
  { name: 'أخبار اليوم', label: 'أخبار قنا', href: 'https://akhbarelyom.com/News/Search/1/1?JournalID=1&query=%D9%85%D8%AD%D8%A7%D9%81%D8%B8%D8%A9+%D9%82%D9%86%D8%A7' },
] as const;

const ITEM_PATTERN = /<item\b[\s\S]*?<\/item>/gi;
const META_TAG_PATTERN = /<meta\s+[^>]*>/gi;
const ATTRIBUTE_PATTERN = /([\w:-]+)\s*=\s*(["'])(.*?)\2/gi;
const SCRIPT_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const STYLE_PATTERN = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const TAG_PATTERN = /<[^>]+>/g;
const WHITESPACE_PATTERN = /\s+/g;
const QENA_WORDS = new Set(['قنا', 'بقنا', 'لقنا']);
const NAQADA_WORDS = new Set(['نقاده', 'بنقاده', 'لنقاده']);
const NAQADA_PLACES = [
  'دنفيق',
  'الخطاره',
  'كوم بلال',
  'طوخ نقاده',
  'اولاد عمرو',
  'البحري قمولا',
  'الاوسط قمولا',
  'الزوايده',
];

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    hellip: '…',
    laquo: '«',
    lt: '<',
    nbsp: ' ',
    quot: '"',
    raquo: '»',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      const hexadecimal = code[1]?.toLowerCase() === 'x';
      const numeric = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function cleanXmlValue(value: string) {
  return decodeEntities(value.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '')).trim();
}

function extractTag(block: string, tag: string) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'));
  return match?.[1] ? cleanXmlValue(match[1]) : '';
}

function extractAttribute(block: string, element: string, attribute: string) {
  const escapedElement = element.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = block.match(new RegExp(`<${escapedElement}\\b[^>]*>`, 'i'))?.[0];
  if (!tag) return '';
  const attributes = [...tag.matchAll(ATTRIBUTE_PATTERN)];
  const match = attributes.find((entry) => entry[1]?.toLowerCase() === attribute.toLowerCase());
  return match?.[3] ? cleanXmlValue(match[3]) : '';
}

function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(SCRIPT_PATTERN, ' ')
    .replace(STYLE_PATTERN, ' ')
    .replace(TAG_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(WHITESPACE_PATTERN, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const candidate = normalized.slice(0, maxLength + 1);
  const boundary = candidate.lastIndexOf(' ');
  return `${candidate.slice(0, boundary > maxLength * .72 ? boundary : maxLength).replace(/[،؛:,.…\-\s]+$/u, '')}…`;
}

function publisherForHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  const entry = Object.entries(PUBLISHERS).find(([domain]) => normalized === domain.replace(/^www\./, '') || normalized.endsWith(`.${domain.replace(/^www\./, '')}`));
  return entry?.[1] ?? null;
}

function unwrapArticleUrl(value: string) {
  if (!value) return null;
  try {
    let parsed = new URL(decodeEntities(value.trim()));
    if (parsed.hostname === 'www.bing.com' || parsed.hostname === 'bing.com') {
      const wrapped = parsed.searchParams.get('url');
      if (!wrapped) return null;
      parsed = new URL(wrapped);
    }
    if (parsed.protocol !== 'https:' || !publisherForHostname(parsed.hostname)) return null;
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ocid|ref)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeImageUrl(value: string, baseUrl?: string) {
  if (!value || value.startsWith('data:')) return null;
  try {
    const parsed = new URL(decodeEntities(value.trim()), baseUrl);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:') return null;
    return TRUSTED_IMAGE_HOSTS.has(hostname) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function imageFromDescription(description: string, articleUrl: string) {
  const imageTag = description.match(/<img\b[^>]*>/i)?.[0];
  if (!imageTag) return null;
  const attributes = [...imageTag.matchAll(ATTRIBUTE_PATTERN)];
  const source = attributes.find((entry) => ['src', 'data-src', 'data-original'].includes(entry[1]?.toLowerCase() || ''))?.[3] || '';
  return safeImageUrl(source, articleUrl);
}

function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function newsCategory(title: string, description: string): NewsCategory {
  const text = normalizeArabic(`${title} ${description}`);
  if (/صحه|مستشفي|طبي|علاج|قافله طبيه|تمريض|اسعاف/.test(text)) return 'صحة';
  if (/تعليم|مدرسه|جامعه|طلاب|امتحان|تنسيق|معلم/.test(text)) return 'تعليم';
  if (/مياه|كهرباء|طريق|مرور|تموين|مواصلات|صرف صحي|خدم/.test(text)) return 'خدمات';
  if (/جمعيه|شباب|ثقافه|رياضه|مبادره|اهالي|مجتمع/.test(text)) return 'مجتمع';
  return 'محليات';
}

function relevance(text: string) {
  const normalized = normalizeArabic(text);
  const words = normalized.split(' ');
  const naqada = words.some((word) => NAQADA_WORDS.has(word)) || NAQADA_PLACES.some((place) => normalized.includes(place));
  const qena = words.some((word) => QENA_WORDS.has(word));
  return { relevant: naqada || qena, isNaqada: naqada };
}

function dateToIso(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
}

function parseFeed(xml: string): ExternalNewsItem[] {
  const itemBlocks = xml.match(ITEM_PATTERN) || [];
  const items: ExternalNewsItem[] = [];

  for (const block of itemBlocks) {
    const rawLink = extractTag(block, 'link') || extractTag(block, 'guid');
    const url = unwrapArticleUrl(rawLink);
    if (!url) continue;

    const title = truncate(stripHtml(extractTag(block, 'title')), 170);
    const rawDescription = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    const description = truncate(stripHtml(rawDescription), 240);
    const match = relevance(`${title} ${description}`);
    if (!title || !match.relevant) continue;

    const parsedUrl = new URL(url);
    const publisher = publisherForHostname(parsedUrl.hostname);
    if (!publisher) continue;

    const feedImage = extractAttribute(block, 'media:content', 'url')
      || extractAttribute(block, 'media:thumbnail', 'url')
      || extractAttribute(block, 'enclosure', 'url');
    const imageUrl = safeImageUrl(feedImage, url) || imageFromDescription(rawDescription, url);
    const publishedAt = dateToIso(extractTag(block, 'pubDate') || extractTag(block, 'dc:date'));

    items.push({
      id: stableId(url),
      title,
      description,
      url,
      source: publisher.name,
      sourceUrl: publisher.homepage,
      publishedAt,
      imageUrl,
      imageAlt: title,
      category: newsCategory(title, description),
      isNaqada: match.isNaqada,
      isOfficial: Boolean(publisher.official),
    });
  }

  return items;
}

function metadataValue(html: string, names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const tag of html.match(META_TAG_PATTERN) || []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(ATTRIBUTE_PATTERN)) {
      if (match[1] && match[3]) attributes.set(match[1].toLowerCase(), decodeEntities(match[3]).trim());
    }
    const key = attributes.get('property')?.toLowerCase() || attributes.get('name')?.toLowerCase();
    if (key && wanted.has(key) && attributes.get('content')) return attributes.get('content') || '';
  }
  return '';
}

async function fetchText(url: string, revalidate: number, timeout: number, accept: string) {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      'User-Agent': 'NaqadaDirectoryNews/1.0 (+https://naqada-directory.vercel.app/news/)',
    },
    next: { revalidate },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`News source responded with ${response.status}`);
  return response.text();
}

async function fetchFeed(feed: FeedDefinition) {
  const xml = await fetchText(feed.url, FEED_REVALIDATE_SECONDS, FEED_TIMEOUT_MS, 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8');
  return parseFeed(xml);
}

async function enrichItem(item: ExternalNewsItem) {
  if (item.imageUrl && item.description.length >= 80) return item;
  try {
    const html = await fetchText(item.url, ARTICLE_REVALIDATE_SECONDS, ARTICLE_TIMEOUT_MS, 'text/html, application/xhtml+xml;q=0.9');
    const imageUrl = item.imageUrl || safeImageUrl(metadataValue(html, ['og:image', 'twitter:image']), item.url);
    const sourceDescription = stripHtml(metadataValue(html, ['og:description', 'twitter:description', 'description']));
    return {
      ...item,
      imageUrl,
      description: item.description || truncate(sourceDescription, 240),
    };
  } catch {
    return item;
  }
}

function deduplicate(items: ExternalNewsItem[]) {
  const byUrl = new Map<string, ExternalNewsItem>();
  const titleKeys = new Set<string>();

  for (const item of items) {
    const urlKey = item.url.replace(/\/$/, '');
    const titleKey = normalizeArabic(item.title).replace(/\s+/g, ' ');
    if (byUrl.has(urlKey) || titleKeys.has(titleKey)) continue;
    byUrl.set(urlKey, item);
    titleKeys.add(titleKey);
  }

  return [...byUrl.values()].sort((left, right) => {
    if (left.isNaqada !== right.isNaqada) return left.isNaqada ? -1 : 1;
    return Date.parse(right.publishedAt || '1970-01-01') - Date.parse(left.publishedAt || '1970-01-01');
  });
}

async function loadLatestNews(): Promise<NewsFeedResult> {
  const results = await Promise.allSettled(NEWS_FEEDS.map(fetchFeed));
  const successfulFeeds = results.filter((result) => result.status === 'fulfilled').length;
  const merged = deduplicate(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
  const enriched = await Promise.all(merged.slice(0, MAX_ITEMS_TO_ENRICH).map(enrichItem));

  return {
    items: [...enriched, ...merged.slice(MAX_ITEMS_TO_ENRICH)].slice(0, 36),
    checkedAt: new Date().toISOString(),
    successfulFeeds,
    totalFeeds: NEWS_FEEDS.length,
  };
}

export const getLatestNews = cache(loadLatestNews);
