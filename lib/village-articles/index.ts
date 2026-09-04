import { villageArticles as baseVillageArticles } from './base';
import { extendedVillageArticles } from './extended';
import { extendedVillageArticles2 } from './extended-2';
import { extendedVillageArticles3 } from './extended-3';
import { extendedVillageArticles4 } from './extended-4';
import { extendedVillageArticles5 } from './extended-5';
import { extendedVillageArticles6 } from './extended-6';
import { extendedVillageArticles7 } from './extended-7';
import { extendedVillageArticles8 } from './extended-8';
import { extendedVillageArticles9 } from './extended-9';
import type { VillageArticle } from './base';

export type { VillageArticleSection, VillageArticleFaq, VillageArticle } from './base';
export { villageArticleAuthor } from './base';

export const villageArticles: VillageArticle[] = [
  ...baseVillageArticles,
  ...extendedVillageArticles,
  ...extendedVillageArticles2,
  ...extendedVillageArticles3,
  ...extendedVillageArticles4,
  ...extendedVillageArticles5,
  ...extendedVillageArticles6,
  ...extendedVillageArticles7,
  ...extendedVillageArticles8,
  ...extendedVillageArticles9,
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
  'عزبة عبد الكريم': 'عزبة عبدالكريم',
  'عزبة عبد كُريم': 'عزبة عبدالكريم',
  'البحرى قمولا': 'البحري قمولا',
  'البحري قامولا': 'البحري قمولا',
  'البحرى قامولا': 'البحري قمولا',
  'الزوايده': 'الزوايدة',
  'الخطاره': 'الخطارة',
  'السدر': 'نجع السدر',
  'نجع ابو عديل': 'نجع أبو عديل',
  'نجع أبوعديل': 'نجع أبو عديل',
  'ساقية القاضي': 'نجع ساقية القاضي',
  'ساقية القاضى': 'نجع ساقية القاضي',
  'نجع ساقية القاضى': 'نجع ساقية القاضي',
  'نجع ابو سلامة': 'نجع أبو سلامة',
  'نجع القليله': 'نجع القليلة',
  'عزبة حامد عبدالمولى': 'عزبة حامد عبد المولى',
  'عزبة حامد عبدالمولي': 'عزبة حامد عبد المولى',
  'عزبة على سعد البحري': 'عزبة علي سعد البحري',
  'عزبة علي سعد البحرى': 'عزبة علي سعد البحري',
  'الحرزات': 'نجع الحزرات',
  'الحرازات': 'نجع الحزرات',
  'نجع الحرزات': 'نجع الحزرات',
  'نجع الحرازات': 'نجع الحزرات',
  'نجع الجواميس': 'الجواميس',
  'الشواهيه': 'نجع الشواهية',
  'نجع الشواهيه': 'نجع الشواهية',
  'الضبعاتى': 'نجع الضبعاتي',
  'نجع الضبعاتى': 'نجع الضبعاتي',
  'القرينات الشرقي': 'نجع القرينات الشرقية',
  'القرينات الشرقية': 'نجع القرينات الشرقية',
  'القرينات الغربي': 'نجع القرينات الغربية',
  'القرينات الغربية': 'نجع القرينات الغربية',
  'الافات': 'نجع اللافات',
  'نجع الافات': 'نجع اللافات',
  'القرنى': 'نجع القرني',
  'نجع القرنى': 'نجع القرني',
  'شرق الترعة': 'نجع شرق الترعة',
  'شرق الترعه': 'نجع شرق الترعة',
  'نجع شرق الترعه': 'نجع شرق الترعة',
  'محمود علي الأمين': 'نجع محمود علي الأمين',
  'محمود علي الامين': 'نجع محمود علي الأمين',
  'نجع محمود علي الامين': 'نجع محمود علي الأمين',
  'الدرهمات': 'عزبة الدرهمات',
  'ساقية عبد الوهاب': 'عزبة ساقية عبد الوهاب',
  'ساقية عبدالوهاب': 'عزبة ساقية عبد الوهاب',
  'عزبة ساقية عبدالوهاب': 'عزبة ساقية عبد الوهاب',
  'ساقية أبو الحمد': 'عزبة ساقية أبو الحمد',
  'ساقية ابو الحمد': 'عزبة ساقية أبو الحمد',
  'عزبة ساقية ابو الحمد': 'عزبة ساقية أبو الحمد',
  'حاجر طوخ': 'نجع حاجر طوخ',
  'كوم الضبع': 'نجع كوم الضبع',
  'ترعة الهدايات': 'نجع ترعة الهدايات',
};

const articleByLocality = new Map(villageArticles.map((article) => [article.locality, article]));

export function getVillageArticle(localityName: string) {
  const canonicalName = articleAliases[localityName] || localityName;
  return articleByLocality.get(canonicalName) || null;
}
