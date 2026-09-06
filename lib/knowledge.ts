import rawAliases from '@/data/knowledge/aliases.json';
import rawContributors from '@/data/knowledge/contributors.json';
import rawHeritage from '@/data/knowledge/heritage.json';
import rawSources from '@/data/knowledge/sources.json';
import rawSummary from '@/data/knowledge/summary.json';
import fieldInformants01 from '@/data/knowledge/field-informants-01.json';
import fieldInformants02 from '@/data/knowledge/field-informants-02.json';
import fieldInformants03 from '@/data/knowledge/field-informants-03.json';
import people01 from '@/data/knowledge/people-01.json';
import people02 from '@/data/knowledge/people-02.json';
import people03 from '@/data/knowledge/people-03.json';
import places01 from '@/data/knowledge/places-01.json';
import places02 from '@/data/knowledge/places-02.json';
import places03 from '@/data/knowledge/places-03.json';
import places04 from '@/data/knowledge/places-04.json';
import places05 from '@/data/knowledge/places-05.json';
import places06 from '@/data/knowledge/places-06.json';
import references01 from '@/data/knowledge/references-01.json';
import references02 from '@/data/knowledge/references-02.json';
import references03 from '@/data/knowledge/references-03.json';

export type KnowledgeContributor = { id:string; name:string; honorific:string; role:string; roleCode:string; badges:string[]; slug:string; primaryWork:string; isAuthor:boolean; attributionShort:string; attributionFull:string };
export type KnowledgeSource = { id:string; title:string; kind:string; author:string; priority:string; year:number|null; usage:string };
export type KnowledgePlace = { id:string; name:string; shortName:string; slug:string; type:string; parent:string; sourceId:string; contributorId:string; verification:string; population1897?:number; male1897?:number; female1897?:number; houses1897?:number; population2014?:number };
export type KnowledgeAlias = { id:string; canonicalName:string; alias:string; type:string; language:string; note:string; sourceId:string; contributorId:string };
export type KnowledgePerson = { id:string; number:number; name:string; slug:string; group:string; professionTags:string[]; placeTags:string[]; sourceId:string; contributorId:string; verification:string; editorialStatus:string };
export type KnowledgeHeritage = { id:string; order:number; name:string; slug:string; category:string; sourceId:string; contributorId:string; verification:string; editorialStatus:string };
export type KnowledgeReference = { id:string; text:string; group:string; sourceId:string; contributorId:string };
export type FieldInformant = { id:string; name:string; locationScope:string; sourceId:string; listedByAuthor:string; recordType:string };

export const knowledgeContributors = rawContributors as KnowledgeContributor[];
export const knowledgeSources = rawSources as KnowledgeSource[];
export const knowledgeSummary = rawSummary;
export const knowledgePlaces = [...places01,...places02,...places03,...places04,...places05,...places06] as KnowledgePlace[];
export const knowledgeAliases = rawAliases as KnowledgeAlias[];
const normalizedPeople03 = people03.map((item) => item.id === 'person-057' ? { ...item, slug: 'دسوقي-الخطاري-فن-الواو' } : item);
export const knowledgePeople = [...people01,...people02,...normalizedPeople03] as KnowledgePerson[];
export const knowledgeHeritage = rawHeritage as KnowledgeHeritage[];
export const knowledgeReferences = [...references01,...references02,...references03] as KnowledgeReference[];
export const fieldInformants = [...fieldInformants01,...fieldInformants02,...fieldInformants03] as FieldInformant[];
export const primaryKnowledgeContributor = knowledgeContributors[0]!;

export function getKnowledgeContributor(slug:string){return knowledgeContributors.find((item)=>item.slug===decodeURIComponent(slug));}
export function getKnowledgePlace(slug:string){const decoded=decodeURIComponent(slug);return knowledgePlaces.find((item)=>item.slug===decoded);}
export function getKnowledgePerson(slug:string){const decoded=decodeURIComponent(slug);return knowledgePeople.find((item)=>item.slug===decoded);}
export function getKnowledgeHeritage(slug:string){const decoded=decodeURIComponent(slug);return knowledgeHeritage.find((item)=>item.slug===decoded);}
export function aliasesForPlace(name:string){return knowledgeAliases.filter((item)=>item.canonicalName===name);}
export function childrenForPlace(name:string){return knowledgePlaces.filter((item)=>item.parent===name);}
export function sourceById(id:string){return knowledgeSources.find((item)=>item.id===id);}
export function contributorById(id:string){return knowledgeContributors.find((item)=>item.id===id);}
export function knowledgeAttribution(contributorId?:string){const contributor=contributorById(contributorId||knowledgeSummary.primaryContributorId)||primaryKnowledgeContributor;return contributor.attributionFull;}

function normalizedPlaceLabel(value:string){
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/[()،,.\-_/]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .replace(/^(مدينه|قريه|نجع|عزبه|حاجر|جزيره)\s+/,'');
}

export function knowledgePlaceForLocality(name:string){
  const exact=knowledgePlaces.find((item)=>item.name===name||item.shortName===name);
  if(exact)return exact;
  const normalized=normalizedPlaceLabel(name);
  return knowledgePlaces.find((item)=>normalizedPlaceLabel(item.name)===normalized||normalizedPlaceLabel(item.shortName)===normalized);
}

export function knowledgePeopleForLocality(name:string,limit=6){
  const normalized=normalizedPlaceLabel(name);
  return knowledgePeople
    .filter((person)=>person.placeTags.some((tag)=>normalizedPlaceLabel(tag)===normalized))
    .slice(0,limit);
}
