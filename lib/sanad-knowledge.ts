import { businesses, canonicalLocalityName, localities } from './data';
import { knowledgePlaces, sourceById } from './knowledge';
import { normalizeArabic } from './site';
import type { SanadReply } from './sanad';

const conversationalWords = new Set(normalizeArabic('يا سند لو سمحت ممكن عايز عاوز عايزه عاوزه محتاج محتاجه اريد ابحث بحث بدور دور دورلي الاقي نلاقي تعرف تعرفني ترشح ترشحلي تقترح ساعدني عن في من فضلك عندك تعرف تجيب هات لي ليا لنا قولي قوللي ايه هو هي اية مين هل فيه فين وين أين اي معلومات احكي كلمني بخصوص رقم ارقام تليفون تلفون هاتف عنوان عناوين مواعيد ساعات عمل مفتوح فاتح شغال دلوقتي حاليا الان ازاي اروح اوصل مكان موقع اقرب قريب قريبه مني افضل احسن كم سعر اسعار تكلفه كام رقمه رقمها عنوانه عنوانها مواعيده مواعيدها وتليفونه وخريطته خريطته خريطتها خريطه تقييمه تقييمها تفاصيل تفاصيله تفاصيلها خدماته خدماتها لو تعرف عاوزين عايزين محتاجين يا معلم باشا ياريت طيب بقى بقي هناك فيها عنده عندهم برضه برضو كمان').split(' '));
const placeNames = localities.map(place => ({ place, name: normalizeArabic(place.name).replace(/^(قريه|مدينه) /, '') })).sort((a,b) => b.name.length-a.name.length);
export function cleanSanadQuery(value: string) {
  let normalized = normalizeArabic(value).replace(/[^\p{L}\p{N}\s]/gu, ' ');
  for (const { name } of placeNames) normalized = normalized.replaceAll(`ب${name}`, ` ${name} `);
  return normalized.split(/\s+/).filter(word => word && !conversationalWords.has(word)).join(' ').slice(0,100);
}
export function namedLocality(value: string) {
  const q = ` ${normalizeArabic(value)} `;
  return placeNames.find(({name}) => q.includes(` ${name} `));
}
export function replaceLocality(previous: string, locality: string) {
  let query = previous;
  for (const {name} of placeNames) query = ` ${query} `.replaceAll(` ${name} `, ' ').trim();
  return `${query} ${locality}`.trim();
}
export function localityKnowledge(message: string, previous: string): SanadReply | null {
  const text = normalizeArabic(message);
  const requested = /سكان|تاريخ|معلومات عن|احكي|كلمني عن|تبع|تتبع|تابعه|بتتبع|بتتبع|قريه|قرية/.test(text);
  if (!requested && previous && !knowledgePlaces.some(p => [p.name,p.shortName].some(name => normalizeArabic(name) === previous))) return null;
  const matchText = ` ${text} `;
  const place = [...knowledgePlaces].sort((a,b) => b.shortName.length-a.shortName.length).find(p => [p.name,p.shortName].some(name => matchText.includes(` ${normalizeArabic(name)} `)))
    || (/سكانها|تبعيه|تابعه لمين|تبع مين|تاريخها/.test(text) ? knowledgePlaces.find(p => normalizeArabic(p.shortName) === previous || normalizeArabic(p.name) === previous) : undefined);
  if (!place || (!requested && cleanSanadQuery(message) !== normalizeArabic(place.shortName))) return null;
  // A service request with a village name must remain a service search.
  if (/صيدل|دكتور|طبيب|مطعم|سباك|كهرب|حضانه|مدرسه|نجار|مستشف|محل|عياده/.test(text)) return null;
  const published = localities.find(l => normalizeArabic(l.name).replace(/^(مدينه|قريه) /,'') === normalizeArabic(place.shortName));
  const source = sourceById(place.sourceId);
  let answer = `${place.name} مذكورة في موسوعة نقادة ضمن ${place.parent}.`;
  if (/سكان/.test(text)) {
    answer = /دلوقتي|حاليا|الان|2026|٢٠٢٦/.test(text) ? 'عدد السكان الحالي غير متاح عندي بمصدر مؤكد.\n' : '';
    answer += place.population2014 ? `العدد الوارد في الموسوعة عن ${place.name} لسنة 2014 هو ${place.population2014.toLocaleString('ar-EG')} نسمة.` : `ما عنديش رقم مسجل لسنة 2014 عن ${place.name}.`;
    if (place.population1897) answer += ` وفي سنة 1897 سُجّل ${place.population1897.toLocaleString('ar-EG')} نسمة.`;
    answer += '\nدي أرقام تاريخية وليست تعدادًا حاليًا.';
  } else {
    if (published?.notes) answer += `\n${published.notes}`;
    if (published) answer += `\nالدليل يضم ${businesses.filter(b => canonicalLocalityName(b.locality) === published.name).length.toLocaleString('ar-EG')} نشاطًا في نطاقها المسجل.`;
    answer += '\nالتبعية هنا بحسب المصدر؛ راجع صفحة المكان لأي اختلاف بين السجل التاريخي والتقسيم الحالي.';
  }
  if (source) answer += `\nالمصدر: ${source.title} — ${source.author}${source.year ? ` (${source.year})` : ''}.`;
  return { text: answer, query: normalizeArabic(place.shortName), cards: [{kind:'knowledge-place',title:`${place.name} في الموسوعة`,subtitle:'المعلومات والمصدر',href:`/knowledge/places/${place.slug}`,badge:'موسوعة نقادة'},...(published ? [{kind:'locality' as const,title:`خدمات ${published.name}`,subtitle:`${published.businessCount} نشاطًا`,href:`/villages/${published.slug}`,badge:'دليل الخدمات'}] : [])], suggestions:[`صيدلية في ${place.shortName}`,`مطعم في ${place.shortName}`,`عدد سكان ${place.shortName}`] };
}
