import { villageArticles as baseVillageArticles } from './base';
import { extendedVillageArticles } from './extended';
import type { VillageArticle } from './base';

export type { VillageArticleSection, VillageArticleFaq, VillageArticle } from './base';
export { villageArticleAuthor } from './base';

export const villageArticles: VillageArticle[] = [
  ...baseVillageArticles,
  ...extendedVillageArticles,
];

const articleAliases: Record<string, string> = {
  'ساحل بشلاو': 'ساحل بشلاو (الهواورة)',
  'الهواورة': 'ساحل بشلاو (الهواورة)',
  'القرية': 'نجع القرية',
  'القرية / نجع القرية': 'نجع القرية',
  'أسمنت الصغرى': 'أسمنت الصغيرة',
  'اسمنت الصغيرة': 'أسمنت الصغيرة',
  'نجع أسمنت الصغرى': 'أسمنت الصغيرة',
  'نجع اسمنت الصغرى': 'أسمنت الصغيرة',
  'عزبة كتي': 'عزبة كُتّي',
  'كتي': 'عزبة كُتّي',
};

const articleByLocality = new Map(villageArticles.map((article) => [article.locality, article]));

export function getVillageArticle(localityName: string) {
  const canonicalName = articleAliases[localityName] || localityName;
  return articleByLocality.get(canonicalName) || null;
}
