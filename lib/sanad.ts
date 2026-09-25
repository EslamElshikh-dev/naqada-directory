import { businesses, families, localities, meta } from './data';
import { cleanSanadQuery, localityKnowledge, namedLocality, replaceLocality } from './sanad-knowledge';
import { normalizeArabic } from './site';
import { recoverSiteSearch, searchSite, type SiteSearchResult } from './site-search';

export type SanadCard = SiteSearchResult & { phone?: string; mapsUrl?: string; detail?: string };
export type SanadReply = { text: string; cards: SanadCard[]; suggestions: string[]; query?: string };
const link = (title: string, href: string, subtitle = ''): SanadCard => ({ title, href, subtitle, kind: 'page', badge: 'دليل نقادة' });
const defaults = ['أبحث عن خدمة', 'وظائف نقادة', 'نماذج مشرفة', 'إزاي أضيف نشاط؟'];
const faq: { match: RegExp; text: string; cards: SanadCard[] }[] = [
  { match: /وظايف|وظيف|شغل|فرص.*عمل|باحث.*عمل|سيره ذاتيه/, text: 'باب الشغل مفتوح في صفحة «وظائف نقادة»: شوف الفرص المنشورة في نقادة وقراها، وفرص قنا في قسم منفصل. عندك وظيفة؟ اكتب تفاصيلها ووسيلة التواصل. وبتدور على شغل؟ اعرض مجالك وخبرتك. إعلانك يظهر بعد المراجعة، والوظائف الخارجية معها رابط المصدر؛ راجع الإعلان قبل التقديم لأن توفر الفرصة ممكن يتغير.', cards: [link('دوّر على فرصة', '/jobs#opportunities'), link('اعرض وظيفة أو خبرتك', '/jobs#participate')] },
  { match: /نماذج مشرفه|شخصيات مشرفه|ناس مشرفه/, text: 'عندنا صفحة لناس من نقادة يستاهلوا النور: حكاياتهم وصورهم ومصادر المعلومات متاحة داخل ملف مستقل لكل شخصية. دوّر بالاسم من البحث لو في بالك حد معين، ولو عندك قصة موثّقة شاركنا تفاصيلها للمراجعة.', cards: [link('نماذج مشرفة في نقادة', '/role-models'), link('ابحث باسم شخص', '/search')] },
  { match: /اشعار|تنبيه|الجرس|صل.*النبي/, text: 'أول مرة تزور فيها الدليل توصلك تحية: «اللهم صل وسلم وزد وبارك علي سيدنا محمد». وبعدها الجرس يعرض إشعارات عن القصص والفرص والسجلات المنشورة فعلًا، والعدد ينقص لما تفتحها. وتقدر تراجع سجلات الأنشطة المحدّثة من صفحة التحديثات.', cards: [link('آخر تحديثات البيانات', '/updates'), link('نماذج مشرفة', '/role-models')] },
  { match: /تحديثات الموقع|اخر التحديثات|ايه الجديد|ايه اتغير/, text: 'في الدليل حاجات اتطوّرت: واجهة الرئيسية ومسارات التنقل والرأس والفوتر على الموبايل، وصفحة مستقلة للمطور بتحكي قصته وتعرض مشاريعه. النماذج المشرفة بقت قصصًا وصفحات بالصور، ومنها آية رفاعي ووفاء حمدي وحسين أبو الصاوي. واتضافت صفحة وظائف نقادة لعرض الفرص وخبرات الباحثين عن شغل، واتحسّن البحث الموحد وروابط القرى والأنشطة. لوحة الإدارة بتعرض الزيارات اليومية والبحث اللي ما لقاش نتيجة، وجرس الإشعارات بقى يجيب من المحتوى المنشور فعلًا، ومع أول زيارة توصلك الصلاة على النبي. صفحة «التحديثات» مخصصة لسجلات الأنشطة ومواعيد مراجعتها، وأخبار نقادة وقنا لها صفحة منفصلة بمصادرها.', cards: [link('الوظائف', '/jobs'), link('النماذج المشرفة', '/role-models'), link('عن المطور', '/developer'), link('سجل تحديثات الأنشطة', '/updates'), link('الأخبار بمصادرها', '/news')] },
  { match: /من المطور|مين المطور|عن المطور|اسلام الشيخ/, text: 'المهندس إسلام الشيخ ابن العسيرات في سوهاج، ومن مواليد الرياض. في صفحته المستقلة تلاقي حكايته وتعليمه وعمله والمشاريع اللي اختار يعرضها؛ يبدأ بدليل العسيرات لأنه قريب من فكرة دليل نقادة. تفاصيل السيرة والمشاريع منشورة في صفحته عشان تقرأها في سياقها.', cards: [link('تعرف على المهندس إسلام الشيخ', '/developer')] },
  { match: /ابحث ازاي|بحث موحد|مفيش نتيجه|ملقتش نتيجه|مش لاقي|مش لاقيه/, text: 'اكتب الخدمة أو اسم الشخص ومعاه القرية في البحث الموحد، زي «صيدلية في دنفيق». لو ما ظهرتش نتيجة، جرّب التهجئة المقترحة أو وسّع النطاق لكل النتائج. ولو المعلومة ناقصة فعلًا، ابعت طلب إضافة أو تصحيح؛ عدم وجودها في الدليل لا يعني إنها مش موجودة في بلدنا.', cards: [link('جرّب البحث الموحد', '/search'), link('أبلغنا عن معلومة ناقصة', '/contribute?type=missing')] },
  { match: /لوحه الاداره|قياس الاداء|عدد الزوار|كلمات البحث/, text: 'لو عندك صلاحية إدارة، لوحة التحكم تعرض زوار كل يوم والجدد منهم والصفحات الأكثر زيارة وكلمات البحث التي لم تظهر لها نتائج، مع اقتراحات لتطوير الدليل. أرقام الزوار الخاصة بالإدارة لا تظهر للعامة.', cards: [link('لوحة الإدارة', '/admin'), link('أولويات إضافة البيانات', '/admin/growth')] },
  { match: /اضيف|اضافه|سجل نشاط|تسجيل نشاط|انشر نشاط/, text: 'يا مرحب بيك! تقدر تضيف نشاطك من صفحة «أضف أو صحح بيانات». جهّز اسم النشاط، نوع الخدمة، القرية، العنوان ورقم التواصل ومصدر يثبت البيانات. راجعها قبل الإرسال، والمساهمة تخضع للمراجعة قبل النشر.', cards: [link('أضف نشاطك للدليل', '/contribute')] },
  { match: /صحح|تصحيح|تعديل|بيانات غلط|رقم غلط|حذف نشاط|ابلاغ/, text: 'ساعدنا نخلي الدليل أدق. افتح صفحة المساهمة، وحدد النشاط والبيانات المطلوب تصحيحها مع مصدر واضح. تقديم الطلب لا يعني أن التعديل نُشر بالفعل.', cards: [link('تصحيح بيانات نشاط', '/contribute')] },
  { match: /تسجيل الدخول|اسجل دخول|انشاء حساب|حسابي|كلمه المرور/, text: 'من صفحة تسجيل الدخول تقدر تدخل لحسابك بالطريقة المتاحة. ولو عندك حساب بالفعل، لوحة العضو هي مكان متابعة مشاركاتك. ما تبعتش كلمة مرورك أو رمز التحقق هنا.', cards: [link('تسجيل الدخول', '/account/login'), link('لوحة العضو', '/account')] },
  { match: /اضيف تقييم|اكتب تقييم|ازاي اقيم|تقييم الموقع|تقييم الدليل|اضافه مراجعه/, text: 'افتح صفحة النشاط ثم قسم التقييمات لمشاركة تجربتك الحقيقية، واكتب تفاصيل الخدمة باحترام. ولو تقصد تقييم الموقع نفسه، هتلاقي قسم «قيّم تجربتك» في الرئيسية. أنا ما بضيفش تقييمات بالنيابة عنك.', cards: [link('تصفح الأنشطة', '/directory'), link('قيّم تجربة الدليل', '/#site-reviews')] },
  { match: /خصوصيه|بياناتي|معلوماتي/, text: 'المحادثة دي بتستخدم سؤالك للبحث في بيانات الدليل المنشورة، ومش بتتحفظ في حسابك. تجنب إرسال أي بيانات حساسة. تقدر تقرأ سياسة الموقع لمعرفة طريقة التعامل مع بيانات العضوية والمساهمات.', cards: [link('سياسة الخصوصية', '/privacy')] },
  { match: /^(مين انت|اسمك ايه|تقدر تعمل ايه|بتعمل ايه|مساعده|ساعدني|اسئله|كل الاسئله)[؟!\s]*$/, text: 'أنا سند، مساعدك في دليل نقادة. أوصّلك للخدمات والأنشطة والقرى والموسوعة والنماذج المشرفة، وأساعدك تلاقي فرص شغل أو تعرض خبرتك، وتعرف إزاي تضيف نشاط أو تصحح معلومة. قولّي بتدور على إيه وفي أي قرية؟ إجاباتي من محتوى الدليل، وأوضح لك لما المعلومة مش متاحة.', cards: [link('الخدمات والأنشطة', '/activities'), link('وظائف نقادة', '/jobs'), link('نماذج مشرفة', '/role-models')] },
  { match: /عن الدليل|عدد الانشطه|كام نشاط|احصائيات|مصادر|موثوق/, text: `الدليل منصة محلية مستقلة، وفيه حاليًا ${meta.businessCount.toLocaleString('ar-EG')} نشاطًا و${meta.localityCount.toLocaleString('ar-EG')} موضعًا. نشر النشاط مش اعتمادًا رسميًا أو ضمانًا لجودة الخدمة. تاريخ التحقق والمصدر المتاحين في الصفحات يساعدوك تراجع المعلومة.`, cards: [link('عن الدليل ومنهجيته', '/about'), link('تغطية الدليل', '/coverage')] },
  { match: /تواصل.*اداره|اكلم.*اداره|شكوي|اقتراح/, text: 'تقدر توصل ملاحظتك أو تصحيحك من صفحة المساهمة، مع تحديد الصفحة المقصودة ووصف المشكلة. أنا أساعدك توصل للنموذج، لكن ما بأكدش استلام الإدارة أو تنفيذ الطلب.', cards: [link('أرسل ملاحظتك', '/contribute')] },
  { match: /اخبار|جديد الدليل|تحديثات|مقالات|مدونه/, text: 'هتلاقي آخر ما نُشر في صفحات التحديثات والمدونة. راجع تاريخ كل منشور؛ المحتوى المعروض مش خدمة أخبار لحظية.', cards: [link('آخر تحديثات الدليل', '/updates'), link('مدونة دليل نقادة', '/blog')] },
];
const cleanQuery = cleanSanadQuery;
function enrich(item: SiteSearchResult): SanadCard {
  const b = item.kind === 'listing' ? businesses.find(b => item.href === `/listing/${b.slug}`) : undefined;
  if (!b) return item;
  return { ...item, phone: b.phone || undefined, mapsUrl: b.mapsUrl?.startsWith('https://') ? b.mapsUrl : undefined, detail: [b.hours ? `المواعيد المسجلة: ${b.hours}` : '', b.checked ? `آخر تحقق: ${b.checked}` : ''].filter(Boolean).join(' · ') };
}
export function answerSanad(message: string, previousQuery = ''): SanadReply {
  const normalized = normalizeArabic(message).replace(/^[\s]*(يا )?سند[،, ]*/, '').trim();
  const response = (text: string, cards: SanadCard[] = [], suggestions = defaults, query?: string): SanadReply => ({ text, cards, suggestions, query });
  if (/^(السلام عليكم|سلام|اهلا|مرحبا|ازيك|صباح الخير|مساء الخير|هلا)[!؟.\s]*$/.test(normalized)) return response('يا مرحب بأهل نقادة وضيوفها! أنا سند، تحت أمرك. بتدور على خدمة، مكان، ولا معلومة عن البلد؟');
  if (/^(شكرا|متشكر|تسلم|الله يخليك|تمام)[!؟.\s]*$/.test(normalized)) return response('تعيش يا غالي، أنا معاك لو محتاج حاجة تانية في دليل نقادة.', [], defaults, previousQuery);
  for (const item of faq) if (item.match.test(normalized)) return response(item.text, item.cards);
  if (/اسعاف|طوارئ|نزيف|مش قادر اتنفس/.test(normalized)) return response('لو فيه خطر فوري، تواصل مع خدمات الطوارئ المحلية حالًا أو اطلب مساعدة شخص قريب. ما تنتظرش رد المحادثة. أقدر أعرض المنشآت الصحية المسجلة، لكن ما أقدرش أؤكد استقبالها للطوارئ أو أوفر تشخيصًا.', [link('المنشآت الصحية في الدليل', '/directory?category='+encodeURIComponent('الطب والصحة'))]);
  if (/تشخيص|جرعه|دواء|اعراض|عالجني|اتعالج ازاي/.test(normalized)) return response('سلامتك أولًا. أنا أساعدك تلاقي طبيب أو منشأة صحية في الدليل، لكن التشخيص والعلاج لازم من مختص. محتاج تخصص إيه وفي أي قرية؟', [], ['طبيب', 'صيدلية', 'مستشفى']);
  if (/^(ابحث عن خدمه|خدمات|خدمه|الانشطه|اقسام الدليل)$/.test(normalized)) return response('قولّي نوع الخدمة والقرية، زي «سباك في بشلاو» أو «صيدلية في نقادة»، وأنا أطلع لك النتائج المتاحة.', [link('كل الخدمات بالأسماء', '/activities')], ['طبيب في نقادة', 'صيدلية', 'مطعم', 'سباك', 'حضانة']);
  if (/^(القري والنجوع|قري نقاده|قري ونجوع نقاده)$/.test(normalized)) return response('دي صفحة القرى والنجوع، ومنها تختار المكان وتشوف أنشطته ومعلوماته. ولو تكتب اسم قرية هنا، أساعدك توصل لها مباشرة.', [link('استكشف القرى والنجوع', '/villages'), ...localities.slice(0, 4).map(l => link(l.name, `/villages/${l.slug}`, `${l.businessCount} نشاطًا`))]);
  if (/^(معالم نقاده|تاريخ نقاده|تراث نقاده|الموسوعه|المعالم السياحيه)$/.test(normalized)) return response('تقدر تستكشف معالم نقادة بالصور، أو تدخل الموسوعة للمكان والأعلام والتراث. كل صفحة بتوضح المعلومات والمصادر المتاحة؛ اسألني باسم معلم أو شخصية عشان أضيّق البحث.', [link('معالم نقادة بالصور', '/landmarks'), link('موسوعة نقادة', '/knowledge'), link('الأعلام والمعالم', '/heritage')]);
  const knowledge = localityKnowledge(message, previousQuery);
  if (knowledge) return knowledge;
  if (/قريب مني|الاقرب ليا/.test(normalized) && !namedLocality(message) && !previousQuery) return response('أنت في أي قرية أو نجع؟ اكتب اسم المكان مع الخدمة، زي «صيدلية في دنفيق». ما عنديش موقعك الحالي، وترتيب البحث مش حسب المسافة.', [], ['صيدلية في نقادة', 'صيدلية في دنفيق', 'صيدلية في بشلاو'], cleanQuery(message));
  let query = cleanQuery(message);
  const previous = cleanQuery(previousQuery);
  const localityOnly = localities.find(l => normalizeArabic(l.name).replace(/^(قريه|مدينه) /, '') === query);
  const ordinal = /(?:^|\s)(?:الاول|الاولي|اول واحد|اول واحده)(?:$|\s)/.test(normalized) ? 0 : /(?:^|\s)(?:الثاني|التاني|التانيه|الثانيه)(?:$|\s)/.test(normalized) ? 1 : /(?:^|\s)(?:الثالث|التالت|التالته|الثالثه)(?:$|\s)/.test(normalized) ? 2 : -1;
  if (previous && ordinal >= 0) {
    const selected = searchSite(previous,3)[ordinal];
    if (!selected) return response('النتيجة دي مش موجودة ضمن الاختيارات السابقة. اكتب اسم النشاط المطلوب أو اختار من النتائج.', [], defaults, previous);
    query = cleanQuery(selected.title);
  } else if (previous && (!query || localityOnly)) {
    query = localityOnly ? replaceLocality(previous, query) : previous;
  }
  if (!query) return response('قولّي اسم النشاط أو نوع الخدمة والقرية عشان أقدر أساعدك بمعلومة محددة.', [], defaults, previous);
  if (/عائل|عيله|نسب|انساب/.test(normalized)) {
    const name = query.replace(/عائله|عائلات|عيله|نسب|انساب/g, '').trim();
    const matches = name ? families.filter(f => normalizeArabic(`${f.name} ${f.locality}`).includes(name)).slice(0, 4) : [];
    return response(matches.length ? 'دي سجلات مرتبطة بالاسم في الدليل. تشابه الأسماء لا يثبت النسب؛ راجع المصدر ودرجة التوثيق داخل السجل.' : 'السجل العائلي بيعرض المعلومات المتاحة بدرجات توثيقها. ما ينفعش نستنتج نسب من تشابه أسماء. تقدر تتصفح السجل أو تكتب اسم العائلة والقرية.', [link('السجل العائلي', '/families'), ...matches.map(f => link(f.name, '/families', `${f.locality} · ${f.status}`))], defaults, query);
  }
  const matches = searchSite(query, 12);
  const cards = matches.slice(0,3).map(enrich);
  const exact = cards.find(card => cleanQuery(card.title) === query);
  if (exact) cards.splice(0,cards.length,exact);
  if (cards.length) {
    let text = `لقيت لك النتائج دي في الدليل عن «${query}». افتح النتيجة للاطلاع على البيانات ومصدرها.`;
    if (cards.length === 1) {
      const business = businesses.find(b => cards[0].href === `/listing/${b.slug}`);
      if (business) text = `${business.name}${business.locality ? ` في ${business.locality}` : ''}.\n${business.description ? `حسب وصف النشاط: ${business.description.split(/[.!؟]/)[0]}.` : [business.subcategory,business.address].filter(Boolean).join(' · ')}\nهتلاقي وسائل التواصل والوصول المتاحة في البطاقة.`;
    }
    if (/رقم|تليفون|هاتف/.test(normalized)) text = cards.some(c => c.phone) ? 'دي الأرقام المنشورة المتاحة للنتائج المطابقة. تقدر تضغط «اتصال» مباشرة.' : 'لقيت نتائج مرتبطة بطلبك، لكن رقم التواصل مش مسجّل للنتائج دي. افتح صفحة النشاط للمعلومات المتاحة.';
    if (/مواعيد|مفتوح|دلوقتي|ساعات/.test(normalized)) text = 'أعرض لك المواعيد المسجلة لو متاحة. ما عنديش تأكيد لحظي إن المكان مفتوح دلوقتي؛ الأفضل تتصل قبل ما تتحرك.';
    if (/سعر|اسعار|تكلفه|بكام/.test(normalized)) text = 'ما عنديش أسعار مؤكدة للخدمة دي. تواصل مع النشاط من النتائج واسأله عن السعر والتفاصيل قبل الحجز.';
    if (/عنوان|اروح|اوصل|خريط|اتجاه/.test(normalized)) text = cards.length === 1 ? `ده العنوان المنشور لـ${cards[0].title}:\n${cards[0].subtitle}\n${cards[0].mapsUrl ? 'افتح الخريطة لاختيار الطريق من موقعك.' : 'رابط خريطة مؤكد غير متاح لهذه النتيجة.'}` : 'دي النتائج المرتبطة بطلبك. اختار النشاط المقصود أو قولّي «الأول» أو «التاني» عشان أحدد لك عنوانه.';
    if (/افضل|احسن|تقييم/.test(normalized)) text += '\nدي نتائج مرتبطة ببحثك، وليست ترتيبًا يضمن الأفضل. قارن التقييمات وتفاصيل الخدمة في صفحات الأنشطة.';
    if (/اقرب|قريب مني/.test(normalized)) text += ' ترتيب النتائج حسب صلة البحث، مش المسافة؛ استخدم الخريطة لتقدير الطريق من مكانك.';
    if (!exact && matches.length > 3) cards.push(link('عرض كل النتائج', `/search?q=${encodeURIComponent(query)}`, 'افتح البحث للمزيد'));
    const suggestions = cards.length === 1 && cards[0].kind === 'listing' ? ['رقمها', 'عنوانها', 'مواعيدها'] : ['تفاصيل الأول', 'تفاصيل التاني', 'أبحث عن خدمة'];
    return response(text, cards, suggestions, query);
  }
  const recovery = recoverSiteSearch(query, undefined, 3);
  return response('ما لقيتش معلومة مطابقة في بيانات الدليل الحالية. جرّب اسم النشاط أو الخدمة مع القرية، أو اختار بحثًا مقترحًا. عدم وجود نتيجة مش معناه إن الخدمة غير موجودة في البلد.', [link('تصفح الدليل كاملًا', '/directory'), link('أضف معلومة ناقصة', '/contribute')], recovery.length ? recovery.map(r => r.query) : defaults, query);
}
