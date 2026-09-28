import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/news-article.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { extractPublisherArticle, isOriginalBrief } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('extracts article paragraphs while excluding navigation and related links', () => {
  const first = 'أعلنت الجهات المختصة في محافظة قنا بدء أعمال الصيانة في الطريق المؤدي إلى قرية أسمنت بمركز نقادة، عقب مراجعة مواقع الحفر ومعاينة الطريق بمعرفة الفرق الميدانية.';
  const second = 'وأوضحت الجهة أن فرق العمل ستتابع التجهيزات صباح اليوم التالي، وتشمل الأعمال معالجة المناطق المتضررة وتسهيل الحركة للمواطنين طوال فترة التنفيذ.';
  const third = 'كما أكدت متابعة الموقف أولًا بأول في نطاق المركز والتنسيق مع الجهات المعنية لتحديث مواعيد المرور حسب تقدم الأعمال، على أن يعلن أي تغيير عبر القنوات الرسمية.';
  const html = '<nav><p>إعلان ' + first + '</p></nav><article><div class="ArticleDetails details"><p>' + first + '</p><div class="advertisement">إعلان</div><p>' + second + '</p><p>' + third + '</p><p>اقرأ أيضًا: ' + first + '</p></div></article><footer><p>' + third + '</p></footer>';
  const article = extractPublisherArticle(html);
  assert.ok(article.includes(first) && article.includes(second) && article.includes(third));
  assert.ok(!article.includes('اقرأ أيضًا'));
  assert.equal(article.split('\n\n').length, 3);
});

test('ignores unrelated pages and rejects a copied or very short generated brief', () => {
  assert.equal(extractPublisherArticle('<nav><p>صفحة بحث بلا مقال</p></nav>'), '');
  const publisher = 'ذكرت الجهات المحلية أن أعمال صيانة الطريق بدأت مساء اليوم في قرية أسمنت بمركز نقادة بعد معاينة الموقف، وستستمر فرق العمل في مراجعة الأعمال مع الحفاظ على حركة الأهالي. ';
  const original = 'أعلنت الإدارة المحلية برنامجًا جديدًا لمعالجة المناطق المتضررة داخل قرية أسمنت، وبدأ التنفيذ بعد زيارة ميدانية لتقدير حجم العمل. ومن المقرر متابعة حركة المواطنين على مدار اليوم، مع نشر أي تغيير في المواعيد بالصفحات الرسمية. وتشارك جهات الخدمة في تنظيم المرور وتأمين نقاط العمل، بينما يقدم فريق الصيانة تقريرًا محدثًا عما اكتمل من المهام.';
  assert.equal(isOriginalBrief('تفاصيل قصيرة', publisher, ''), false);
  assert.equal(isOriginalBrief(publisher.repeat(3), publisher, ''), false);
  assert.equal(isOriginalBrief(original, publisher, ''), true);
});
