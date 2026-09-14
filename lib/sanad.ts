import { businesses, families, localities, meta } from './data';
import { normalizeArabic } from './site';
import { recoverSiteSearch, searchSite, type SiteSearchResult } from './site-search';

export type SanadCard = SiteSearchResult & { phone?: string; mapsUrl?: string; detail?: string };
export type SanadReply = { text: string; cards: SanadCard[]; suggestions: string[]; query?: string };
const link = (title: string, href: string, subtitle = ''): SanadCard => ({ title, href, subtitle, kind: 'page', badge: 'دليل نقادة' });
const defaults = ['أبحث عن خدمة', 'القرى والنجوع', 'إزاي أضيف نشاط؟', 'معالم نقادة'];
const faq: { match: RegExp; text: string; cards: SanadCard[] }[] = [
  { match: /اضيف|اضافه|سجل نشاط|تسجيل نشاط|انشر نشاط/, text: 'يا مرحب بيك! تقدر تضيف نشاطك من صفحة «أضف أو صحح بيانات». جهّز اسم النشاط، نوع الخدمة، القرية، العنوان ورقم التواصل ومصدر يثبت البيانات. راجعها قبل الإرسال، والمساهمة تخضع للمراجعة قبل النشر.', cards: [link('أضف نشاطك للدليل', '/contribute')] },
  { match: /صحح|تصحيح|تعديل|بيانات غلط|رقم غلط|حذف نشاط|ابلاغ/, text: 'ساعدنا نخلي الدليل أدق. افتح صفحة المساهمة، وحدد النشاط والبيانات المطلوب تصحيحها مع مصدر واضح. تقديم الطلب لا يعني أن التعديل نُشر بالفعل.', cards: [link('تصحيح بيانات نشاط', '/contribute')] },
  { match: /تسجيل الدخول|اسجل دخول|حساب|كلمه المرور|جوجل|google/, text: 'من صفحة تسجيل الدخول تقدر تدخل لحسابك بالطريقة المتاحة. ولو عندك حساب بالفعل، لوحة العضو هي مكان متابعة مشاركاتك. ما تبعتش كلمة مرورك أو رمز التحقق هنا.', cards: [link('تسجيل الدخول', '/account/login'), link('لوحة العضو', '/account')] },
  { match: /تقييم|مراجعه|مراجعات/, text: 'افتح صفحة النشاط ثم قسم التقييمات لمشاركة تجربتك الحقيقية، واكتب تفاصيل الخدمة باحترام. ولو تقصد تقييم الموقع نفسه، هتلاقي قسم «قيّم تجربتك» في الرئيسية. أنا ما بضيفش تقييمات بالنيابة عنك.', cards: [link('تصفح الأنشطة', '/directory'), link('قيّم تجربة الدليل', '/#site-reviews')] },
  { match: /خصوصيه|بياناتي|معلوماتي/, text: 'المحادثة دي بتستخدم سؤالك للبحث في بيانات الدليل المنشورة، ومش بتتحفظ في حسابك. تجنب إرسال أي بيانات حساسة. تقدر تقرأ سياسة الموقع لمعرفة طريقة التعامل مع بيانات العضوية والمساهمات.', cards: [link('سياسة الخصوصية', '/privacy')] },
  { match: /مين انت|اسمك|تقدر تعمل|بتعمل ايه|مساعده|ساعدني|اسئله|كل الاسئله/, text: 'أنا سند، مساعدك في دليل نقادة. أسندك في الوصول للخدمات والأنشطة والأرقام والعناوين المتاحة، والقرى والنجوع، والمعالم والتراث والأعلام والعائلات، وكمان استخدام الدليل وإضافة نشاط. قولّي بتدور على إيه وفي أي قرية؟ إجاباتي من محتوى الدليل، وأوضح لك لما المعلومة مش متاحة.', cards: [link('الخدمات والأنشطة', '/activities'), link('موسوعة نقادة', '/knowledge')] },
  { match: /عن الدليل|عدد الانشطه|كام نشاط|احصائيات|مصادر|موثوق/, text: `الدليل منصة محلية مستقلة، وفيه حاليًا ${meta.businessCount.toLocaleString('ar-EG')} نشاطًا و${meta.localityCount.toLocaleString('ar-EG')} موضعًا. نشر النشاط مش اعتمادًا رسميًا أو ضمانًا لجودة الخدمة. تاريخ التحقق والمصدر المتاحين في الصفحات يساعدوك تراجع المعلومة.`, cards: [link('عن الدليل ومنهجيته', '/about'), link('تغطية الدليل', '/coverage')] },
  { match: /تواصل.*اداره|اكلم.*اداره|شكوي|اقتراح/, text: 'تقدر توصل ملاحظتك أو تصحيحك من صفحة المساهمة، مع تحديد الصفحة المقصودة ووصف المشكلة. أنا أساعدك توصل للنموذج، لكن ما بأكدش استلام الإدارة أو تنفيذ الطلب.', cards: [link('أرسل ملاحظتك', '/contribute')] },
  { match: /اخبار|جديد الدليل|تحديثات|مقالات|مدونه/, text: 'هتلاقي آخر ما نُشر في صفحات التحديثات والمدونة. راجع تاريخ كل منشور؛ المحتوى المعروض مش خدمة أخبار لحظية.', cards: [link('آخر تحديثات الدليل', '/updates'), link('مدونة دليل نقادة', '/blog')] },
];
const noise = new Set(normalizeArabic('يا سند لو سمحت ممكن عايز عاوز محتاج اريد ابحث بحث عن في من فضلك عندك تعرف تجيب هات لي ليا قولي قوللي ايه هو هي اية معلومات احكي كلمني بخصوص رقم تليفون هاتف عنوان مواعيد ساعات عمل مفتوح دلوقتي الان ازاي اروح اوصل مكان موقع اقرب افضل احسن فين وين أين كم سعر اسعار تكلفه كام').split(' '));
function cleanQuery(value: string) {
  return normalizeArabic(value).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(t => t && !noise.has(t)).join(' ').slice(0, 100);
}
function enrich(item: SiteSearchResult): SanadCard {
  const b = item.kind === 'listing' ? businesses.find(b => item.href === `/listing/${b.slug}`) : undefined;
  if (!b) return item;
  return { ...item, phone: b.phone || undefined, mapsUrl: b.mapsUrl?.startsWith('https://') ? b.mapsUrl : undefined, detail: [b.hours ? `المواعيد المسجلة: ${b.hours}` : '', b.checked ? `آخر تحقق: ${b.checked}` : ''].filter(Boolean).join(' · ') };
}
export function answerSanad(message: string, previousQuery = ''): SanadReply {
  const normalized = normalizeArabic(message);
  const response = (text: string, cards: SanadCard[] = [], suggestions = defaults, query?: string): SanadReply => ({ text, cards, suggestions, query });
  if (/^(السلام عليكم|سلام|اهلا|مرحبا|ازيك|صباح الخير|مساء الخير|هلا)[!؟.\s]*$/.test(normalized)) return response('يا مرحب بأهل نقادة وضيوفها! أنا سند، تحت أمرك. بتدور على خدمة، مكان، ولا معلومة عن البلد؟');
  if (/^(شكرا|متشكر|تسلم|الله يخليك|تمام)[!؟.\s]*$/.test(normalized)) return response('تعيش يا غالي، أنا معاك لو محتاج حاجة تانية في دليل نقادة.');
  for (const item of faq) if (item.match.test(normalized)) return response(item.text, item.cards);
  if (/اسعاف|طوارئ|نزيف|مش قادر اتنفس/.test(normalized)) return response('لو فيه خطر فوري، تواصل مع خدمات الطوارئ المحلية حالًا أو اطلب مساعدة شخص قريب. ما تنتظرش رد المحادثة. أقدر أعرض المنشآت الصحية المسجلة، لكن ما أقدرش أؤكد استقبالها للطوارئ أو أوفر تشخيصًا.', [link('المنشآت الصحية في الدليل', '/directory?category='+encodeURIComponent('الطب والصحة'))]);
  if (/علاج|تشخيص|جرعه|دواء|اعراض/.test(normalized)) return response('سلامتك أولًا. أنا أساعدك تلاقي طبيب أو منشأة صحية في الدليل، لكن التشخيص والعلاج لازم من مختص. محتاج تخصص إيه وفي أي قرية؟', [], ['طبيب', 'صيدلية', 'مستشفى']);
  if (/^(ابحث عن خدمه|خدمات|خدمه|الانشطه|اقسام الدليل)$/.test(normalized)) return response('قولّي نوع الخدمة والقرية، زي «سباك في بشلاو» أو «صيدلية في نقادة»، وأنا أطلع لك النتائج المتاحة.', [link('كل الخدمات بالأسماء', '/activities')], ['طبيب في نقادة', 'صيدلية', 'مطعم', 'سباك', 'حضانة']);
  if (/^(القري والنجوع|قري نقاده|قري ونجوع نقاده)$/.test(normalized)) return response('دي صفحة القرى والنجوع، ومنها تختار المكان وتشوف أنشطته ومعلوماته. ولو تكتب اسم قرية هنا، أساعدك توصل لها مباشرة.', [link('استكشف القرى والنجوع', '/villages'), ...localities.slice(0, 4).map(l => link(l.name, `/villages/${l.slug}`, `${l.businessCount} نشاطًا`))]);
  if (/^(معالم نقاده|تاريخ نقاده|تراث نقاده|الموسوعه|المعالم السياحيه)$/.test(normalized)) return response('تقدر تستكشف معالم نقادة بالصور، أو تدخل الموسوعة للمكان والأعلام والتراث. كل صفحة بتوضح المعلومات والمصادر المتاحة؛ اسألني باسم معلم أو شخصية عشان أضيّق البحث.', [link('معالم نقادة بالصور', '/landmarks'), link('موسوعة نقادة', '/knowledge'), link('الأعلام والمعالم', '/heritage')]);
  let query = cleanQuery(message);
  const previous = cleanQuery(previousQuery);
  const localityOnly = localities.find(l => normalizeArabic(l.name).replace(/^(قريه|مدينه) /, '') === query);
  if (previous && (!query || localityOnly || /^(هناك|فيها|عنده|عندهم)$/.test(query))) {
    const oldWithoutLocality = localities.reduce((q, l) => q.replace(normalizeArabic(l.name), '').replace(normalizeArabic(l.name).replace(/^(قريه|مدينه) /, ''), ''), previous).trim();
    query = localityOnly ? `${oldWithoutLocality} ${query}`.trim() : previous;
  }
  if (!query) return response('قولّي اسم النشاط أو نوع الخدمة والقرية عشان أقدر أساعدك بمعلومة محددة.', [], defaults, previous);
  if (/عائل|عيله|نسب|انساب/.test(normalized)) {
    const name = query.replace(/عائله|عائلات|عيله|نسب|انساب/g, '').trim();
    const matches = name ? families.filter(f => normalizeArabic(`${f.name} ${f.locality}`).includes(name)).slice(0, 4) : [];
    return response(matches.length ? 'دي سجلات مرتبطة بالاسم في الدليل. تشابه الأسماء لا يثبت النسب؛ راجع المصدر ودرجة التوثيق داخل السجل.' : 'السجل العائلي بيعرض المعلومات المتاحة بدرجات توثيقها. ما ينفعش نستنتج نسب من تشابه أسماء. تقدر تتصفح السجل أو تكتب اسم العائلة والقرية.', [link('السجل العائلي', '/families'), ...matches.map(f => link(f.name, '/families', `${f.locality} · ${f.status}`))], defaults, query);
  }
  const cards = searchSite(query, 5).map(enrich);
  if (cards.length) {
    let text = `لقيت لك النتائج دي في الدليل عن «${query}». افتح النتيجة للاطلاع على البيانات ومصدرها.`;
    if (/رقم|تليفون|هاتف/.test(normalized)) text = cards.some(c => c.phone) ? 'دي الأرقام المنشورة المتاحة للنتائج المطابقة. تقدر تضغط «اتصال» مباشرة.' : 'لقيت نتائج مرتبطة بطلبك، لكن رقم التواصل مش مسجّل للنتائج دي. افتح صفحة النشاط للمعلومات المتاحة.';
    if (/مواعيد|مفتوح|دلوقتي|ساعات/.test(normalized)) text = 'أعرض لك المواعيد المسجلة لو متاحة. ما عنديش تأكيد لحظي إن المكان مفتوح دلوقتي؛ الأفضل تتصل قبل ما تتحرك.';
    if (/سعر|اسعار|تكلفه|بكام/.test(normalized)) text = 'ما عنديش أسعار مؤكدة للخدمة دي. تواصل مع النشاط من النتائج واسأله عن السعر والتفاصيل قبل الحجز.';
    if (/اقرب|قريب مني/.test(normalized)) text += ' ترتيب النتائج حسب صلة البحث، مش المسافة؛ استخدم الخريطة لتقدير الطريق من مكانك.';
    return response(text, cards, ['إزاي أضيف نشاط؟', 'أبحث عن خدمة', 'القرى والنجوع'], query);
  }
  const recovery = recoverSiteSearch(query, undefined, 3);
  return response('ما لقيتش معلومة مطابقة في بيانات الدليل الحالية. جرّب اسم النشاط أو الخدمة مع القرية، أو اختار بحثًا مقترحًا. عدم وجود نتيجة مش معناه إن الخدمة غير موجودة في البلد.', [link('تصفح الدليل كاملًا', '/directory'), link('أضف معلومة ناقصة', '/contribute')], recovery.length ? recovery.map(r => r.query) : defaults, query);
}
