import { LOCAL_PLACES } from './places.ts';

const hiring = '(وظائف OR مطلوب OR "فرص عمل" OR hiring OR vacancy)';
const naqada = '(نقادة OR نقاده OR Naqada OR Nagada)';
const google = (name: string, query: string) => ({ name, url: `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:14d`)}&hl=ar&gl=EG&ceid=EG:ar` });
const bing = (name: string, query: string) => ({ name, url: `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setlang=ar-eg&cc=eg` });
const publicSearch = (name: string, query: string) => ({ name, url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&setlang=ar-eg&cc=eg` });

// OR groups cover every known village without requiring an advert to mention
// several villages at once. Qena context disambiguates common place names.
const villages = LOCAL_PLACES.filter((place) => !['نقادة', 'مركز نقادة', 'مدينة نقادة'].includes(place));
export const VILLAGE_SEARCH_GROUPS = Array.from({ length: Math.ceil(villages.length / 12) }, (_, index) =>
  `(${villages.slice(index * 12, index * 12 + 12).map((place) => `"${place}"`).join(' OR ')})`);

export const FEEDS = [
  google('أخبار Google · نقادة', `${hiring} ${naqada}`),
  bing('أخبار Bing · نقادة', `${hiring} ${naqada}`),
  ...VILLAGE_SEARCH_GROUPS.map((group, index) => google(`أخبار Google · قرى نقادة ${index + 1}`, `${hiring} (قنا OR نقادة) ${group}`)),
  google('أخبار Google · الأقصر', `${hiring} (الأقصر OR Luxor OR إسنا OR أرمنت)`),
  google('أخبار Google · قرى الأقصر', `${hiring} (الأقصر OR إسنا OR أرمنت OR القرنة OR الطود)`),
  bing('أخبار Bing · الأقصر وقراها', `${hiring} (الأقصر OR إسنا OR أرمنت OR القرنة OR الزينية OR الطود OR البياضية)`),
];

export const PUBLIC_FACEBOOK_SEARCHES = [
  publicSearch('جروبات نقادة العامة', `site:facebook.com/groups/ ${naqada} ${hiring}`),
  publicSearch('صفحات نقادة العامة', `site:facebook.com ${naqada} ${hiring}`),
  ...VILLAGE_SEARCH_GROUPS.map((group, index) => publicSearch(`منشورات قرى نقادة العامة ${index + 1}`, `site:facebook.com (قنا OR نقادة) ${group} ${hiring}`)),
  publicSearch('جروبات الأقصر العامة', `site:facebook.com/groups/ الأقصر ${hiring}`),
  publicSearch('صفحات الأقصر العامة', `site:facebook.com (الأقصر OR إسنا) ${hiring}`),
  publicSearch('جروبات قرى الأقصر العامة', `site:facebook.com/groups/ (إسنا OR أرمنت OR القرنة) ${hiring}`),
];

const naqadaChannel = { name: 'وظائف صعيد مصر · تيليجرام', channel: 'QenaLuxorJobs' };
export const PUBLIC_SOCIAL_FEEDS = [
  { ...naqadaChannel, url: 'https://t.me/s/QenaLuxorJobs' },
  { name: 'وظائف الأقصر · تيليجرام', channel: 'LuxorJobsTele', url: 'https://t.me/s/LuxorJobsTele' },
  ...['نقادة', 'نقاده', 'Naqada', 'بشلاو', 'قمولا', 'دنفيق', 'الخطارة', 'طوخ'].map((query) => ({
    ...naqadaChannel, name: `${naqadaChannel.name} · ${query}`, url: `https://t.me/s/QenaLuxorJobs?q=${encodeURIComponent(query)}`,
  })),
];
