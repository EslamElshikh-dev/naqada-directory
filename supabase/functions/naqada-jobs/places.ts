// Generated from data/localities.json, lib/data.ts supplementalLocalities, and data/businesses-*.json.
export const LOCAL_PLACES = [
  "نقادة",
  "مركز نقادة",
  "مدينة نقادة",
  "البحري قمولا",
  "الأوسط قمولا",
  "دنفيق",
  "طوخ",
  "الخطارة",
  "الزوايدة",
  "عزبة المصري",
  "عزبة طايع",
  "عزبة حامد عبد المولى",
  "عزبة علي سعد البحري",
  "نجع الحزرات",
  "نجع السدر",
  "نجع الصوالح",
  "نجع ساقية القاضي",
  "نجع أبو سلامة",
  "نجع قرقطان الشرقية",
  "نجع أبو عديل",
  "نجع الجديدة",
  "نجع القليلة",
  "نجع الترعة",
  "الجواميس",
  "نجع الخرابيش",
  "نجع السبيل",
  "نجع الشواهية",
  "نجع الشيخ نصر",
  "نجع سالمان",
  "نجع الجحاريد",
  "نجع الريانية",
  "نجع الضبعاتي",
  "نجع العجيلات",
  "نجع العمامرة",
  "نجع القرينات الشرقية",
  "نجع القرينات الغربية",
  "نجع القطط",
  "نجع اللافات",
  "نجع الفيران",
  "نجع القرني",
  "نجع شرق الترعة",
  "نجع عطا",
  "نجع محمود علي الأمين",
  "عزبة الدرهمات",
  "عزبة ساقية عبد الوهاب",
  "عزبة ساقية أبو الحمد",
  "نجع حاجر طوخ",
  "نجع كوم الضبع",
  "نجع ترعة الهدايات",
  "نجع الحريقة",
  "نجع الصوامعة",
  "نجع الهدايات",
  "بشلاو",
  "نجع النقير",
  "ساحل بشلاو (الهواورة)",
  "الصليبة",
  "ساحل دراو",
  "عزبة جبر",
  "نجع الصدر",
  "القرية",
  "نجع عفاش - بشلاو",
  "نجع عفاش - القرية",
  "صوص",
  "العلالمة",
  "العربات",
  "جرف علي",
  "دراو",
  "دويح",
  "أسمنت الصغيرة",
  "نجع الشروعة",
  "نجع الغطاطسة",
  "عزبة الأعوارية",
  "جزيرة أحمد سعد",
  "نجع العوامر",
  "عزبة كُتّي",
  "عزبة علي عبيد",
  "عزبة طايل",
  "عزبة عبدالكريم",
  "جزيرة جبر",
  "الظهير الصحراوي",
  "كوم بلال",
  "أسمنت",
  "المنشية",
  "الشيخ حسين",
  "قرقطان",
  "حاجر دنفيق",
  "نجع الجنيدي"
] as const;

const rankedPlaces = [...LOCAL_PLACES].sort((a, b) => b.length - a.length);
const normalized = (value: string) => value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064b-\u065f\u0670]/g, '');

export function findLocalPlace(headline: string, details = '') {
  const head = normalized(headline);
  const body = normalized(details);
  return rankedPlaces.find((place) => head.includes(normalized(place)))
    || rankedPlaces.find((place) => body.includes(normalized(place)));
}

// Centres and villages of Luxor governorate. The villages below are listed by
// the governorate; village matches require a Luxor context in the announcement.
export const LUXOR_PLACES = [
  'مدينة الأقصر', 'الكرنك', 'العوامية', 'الأقصر الجديدة', 'مدينة طيبة',
  'مدينة إسنا', 'الحلة', 'زرنيخ', 'الكلابية', 'الدير', 'الحميدات', 'الهنادي',
  'الشغب', 'الدبابية', 'المعلا', 'كيمان المطاعنة', 'طفنيس', 'الغريرة',
  'أصفون', 'المطاعنة', 'توماس وعافية', 'النمسا', 'القرايا', 'المساوية',
  'كومير', 'العضايمة', 'جزيرة راجح', 'النجوع بحري', 'النجوع قبلي',
  'مدينة أرمنت', 'أرمنت الحيط', 'أرمنت الوابورات', 'الرزيقات قبلي',
  'الرزيقات بحري', 'المحاميد بحري', 'الرياينة',
  'مدينة القرنة', 'الغربي قامولا', 'القبلي قامولا', 'البعيرات',
  'الأقالتة', 'الضبعية', 'الملاحة', 'الشيخ عامر',
  'مدينة الزينية', 'الزينية بحري', 'الصعايدة', 'العشي',
  'المدامود قبلي', 'المدامود بحري',
  'مدينة الطود', 'العديسات قبلي', 'العديسات بحري', 'الطود غرب',
  'منشية النوبة', 'المريس',
  'مدينة البياضية', 'البغدادي', 'الحبيل', 'الروافعة الغربية',
] as const;

const luxorCentres = ['إسنا', 'أرمنت', 'القرنة', 'الزينية', 'الطود', 'البياضية', 'طيبة'];
const rankedLuxor = [...LUXOR_PLACES, ...luxorCentres].sort((a, b) => b.length - a.length);

export function canonicalLuxorLocality(place: string) {
  const value = normalized(place.trim());
  if (value === 'الاقصر' || value === 'مدينه الاقصر') return 'مدينة الأقصر';
  if (value === 'محافظه الاقصر') return 'محافظة الأقصر';
  const known = rankedLuxor.find((item) => normalized(item) === value);
  return known ? luxorCentres.includes(known) ? `مدينة ${known}` : known : place;
}

export function findLuxorPlace(headline: string, details = '') {
  const head = normalized(headline).replace(/https?:\/\/\S+/g, ' ');
  const body = normalized(details).replace(/https?:\/\/\S+/g, ' ');
  const context = `${head} ${body}`;
  // Common village names can occur elsewhere, so only match them when the
  // post itself names Luxor or one of its distinctive centres.
  const hasContext = /(الاقصر|\bluxor\b|اسنا|ارمنت|القرنه|الزينيه|الطود|البياضيه|مدينه طيبه|الكرنك|العديسات|المدامود|البعيرات|اصفون|كيمان المطاعنه)/i.test(context);
  if (!hasContext) return null;
  const place = rankedLuxor.find((item) => head.includes(normalized(item)))
    || rankedLuxor.find((item) => body.includes(normalized(item)));
  if (place) return luxorCentres.includes(place) ? `مدينة ${place}` : place;
  return 'محافظة الأقصر';
}

export function findJobPlace(headline: string, details = ''): { locality: string; governorate: 'قنا' | 'الأقصر' } | null {
  const head = normalized(headline);
  const body = normalized(details);
  // A centre named in the heading is stronger evidence than a generic region
  // mentioned in the snippet. Mixed-region roundups without a specific place
  // are skipped, since their work location cannot be established.
  const luxor = findLuxorPlace(headline, details);
  const qena = findLocalPlace(headline, details);
  const mentionsQena = /(قنا|نقاده)/.test(`${head} ${body}`);
  if (luxor && (!mentionsQena || (!qena && /(اسنا|ارمنت|القرنه|الزينيه|الطود|البياضيه)/.test(head)))) return { locality: luxor, governorate: 'الأقصر' };
  if (qena && (qena === 'نقادة' || mentionsQena || /(بشلاو|قمولا|دنفيق)/.test(normalized(qena)))) {
    return { locality: qena === 'نقادة' ? 'مدينة نقادة' : qena, governorate: 'قنا' };
  }
  return null;
}
