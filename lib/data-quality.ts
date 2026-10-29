import type { Business } from './types';
import { cleanPhone, normalizeArabic } from './site';
import { getBusinessMedia } from './business-media';
import { isActivityMapUrl } from './activity-map';
export function businessCompleteness(item: Business) {
  const fields = [
    { name: 'الهاتف', present: Boolean(cleanPhone(item.phone)) },
    { name: 'المواعيد', present: Boolean(item.hours?.trim()) },
    { name: 'العنوان', present: Boolean(item.address?.trim()) },
    { name: 'صورة النشاط', present: Boolean(item.ownerPhotoPaths?.length || getBusinessMedia(item.id)) },
    { name: 'الخريطة', present: Boolean(item.mapsUrl && isActivityMapUrl(item.mapsUrl)) },
  ];
  return { item, missing: fields.filter(field => !field.present).map(field => field.name), score: fields.filter(field => field.present).length * 20 };
}

function similarity(a: string, b: string) {
  const first = new Set(normalizeArabic(a).split(/\s+/).filter(Boolean));
  const second = new Set(normalizeArabic(b).split(/\s+/).filter(Boolean));
  return first.size + second.size ? 2 * [...first].filter(token => second.has(token)).length / (first.size + second.size) : 0;
}

/** Review candidates only: a shared phone or similar copy never merges/deletes a record. */
export function possibleBusinessDuplicates(rows: Business[]) {
  const candidates: { first: Business; second: Business; reasons: string[]; score: number }[] = [];
  for (let i=0;i<rows.length;i++) for (let j=i+1;j<rows.length;j++) {
    const first=rows[i],second=rows[j];
    if (!first.locality || normalizeArabic(first.locality)!==normalizeArabic(second.locality || '')) continue;
    const name=similarity(first.name,second.name), description=similarity(first.description||'',second.description||'');
    const phone=cleanPhone(first.phone), samePhone=Boolean(phone&&phone===cleanPhone(second.phone));
    if (!samePhone&&name<0.7&&!(first.category===second.category&&description>=0.75)) continue;
    const reasons=[...(samePhone?['هاتف مطابق']:[]),...(name>=0.7?['اسم متشابه']:[]),...(description>=0.75?['وصف خدمة متشابه']:[])];
    candidates.push({first,second,reasons,score:name+(samePhone?1:0)+description/2});
  }
  return candidates.sort((a,b)=>b.score-a.score).slice(0,100);
}
