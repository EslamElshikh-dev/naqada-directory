import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'الخصوصية واستخدام البيانات — دليل نقادة',
  description: 'كيف يتعامل دليل نقادة مع بيانات البحث والمساهمات وقياس الأداء، وما الذي لا نجمعه أو ننشره.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  const pageUrl = `${siteConfig.url}/privacy`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'الخصوصية واستخدام البيانات — دليل نقادة',
    url: pageUrl,
    description: 'سياسة مبسطة توضح بيانات الاستخدام والمساهمات التي يعالجها دليل نقادة وحدود استخدامها.',
    isPartOf: { '@id': `${siteConfig.url}#website` },
    dateModified: '2026-09-04',
  };

  return (
    <main id="main-content" className="page-main">
      <section className="about-hero">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><span>الخصوصية</span></nav>
          <span className="eyebrow">الوضوح قبل القياس</span>
          <h1>الخصوصية و<em>استخدام البيانات</em></h1>
          <p>نستخدم أقل قدر عملي من البيانات لتحسين الدليل ومراجعة المساهمات. لا نبيع بيانات المستخدمين، ولا ننشر بيانات التواصل الاختيارية داخل صفحات الدليل.</p>
        </div>
      </section>

      <section className="shell page-section">
        <div className="detail-layout">
          <article className="detail-card">
            <div className="detail-card__heading"><span className="eyebrow eyebrow--dark">بيانات الاستخدام</span><h2>ما الذي نسجله لتحسين الدليل؟</h2></div>
            <div className="methodology__grid">
              <article><b>01</b><h3>البحث والنتائج</h3><p>قد نسجل أن عملية بحث حدثت، وعدد النتائج، والتصنيف أو الموضع المختار. عند عدم وجود نتائج قد نحفظ عبارة البحث بعد فلترتها من صيغ البريد الإلكتروني وأرقام الهواتف.</p></article>
              <article><b>02</b><h3>إجراءات صفحات الأنشطة</h3><p>نسجل أحداثًا مثل الضغط على الاتصال أو واتساب أو الخريطة أو مشاركة السجل، مع ربط الحدث بمعرّف السجل والتصنيف والموضع متى كان ذلك متاحًا.</p></article>
              <article><b>03</b><h3>جلسة المتصفح</h3><p>يُنشأ معرّف عشوائي مؤقت داخل Session Storage للمساعدة في فهم تسلسل الاستخدام داخل الجلسة نفسها. لا يُستخدم كحساب مستخدم أو ملف شخصي دائم.</p></article>
            </div>

            <div className="source-panel" style={{ marginTop: 24 }}>
              <span>حماية إضافية ضد الإساءة</span>
              <strong>لا نخزن عنوان IP الخام ضمن سجلات الاستخدام العامة للدليل.</strong>
              <p>يستخدم مسار الاستقبال قيمة مشتقة مشفّرة ومتغيرة يوميًا فقط لتطبيق حدود معدل الطلبات ومقاومة السبام.</p>
            </div>
          </article>

          <aside className="detail-aside">
            <span className="eyebrow eyebrow--dark">ملخص سريع</span>
            <h2>ما الذي لا نفعله؟</h2>
            <div className="detail-aside__links">
              <span>لا نبيع بيانات المستخدمين.</span>
              <span>لا ننشر وسيلة التواصل الاختيارية للمساهم.</span>
              <span>لا نحفظ نص بحث يبدو بريدًا إلكترونيًا أو رقم هاتف.</span>
              <span>لا تنشر المساهمات تلقائيًا قبل المراجعة.</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section--muted">
        <div className="shell methodology">
          <div>
            <span className="eyebrow eyebrow--dark">المساهمات</span>
            <h2>عندما تضيف نشاطًا أو ترسل تصحيحًا</h2>
            <p>نحفظ بيانات الطلب اللازمة للمراجعة: نوع الطلب، الاسم، التصنيف والموضع إن وُجدا، التفاصيل، رابط المصدر العام، معرّف السجل عند التصحيح، ووسيلة التواصل فقط إذا أضفتها باختيارك.</p>
            <Link href="/contribute" className="text-link">فتح نموذج المساهمة ←</Link>
          </div>
          <div className="methodology__grid">
            <article><b>01</b><h3>غرض واضح</h3><p>تُستخدم بيانات الطلب لمراجعة إضافة أو تصحيح أو نتيجة مفقودة وتحسين جودة التغطية.</p></article>
            <article><b>02</b><h3>وصول مقيد</h3><p>جداول المساهمات والتحليلات ليست متاحة للقراءة أو الكتابة مباشرة من المتصفح العام؛ تمر الطلبات عبر مسار استقبال خادمي.</p></article>
            <article><b>03</b><h3>مصدر اختياري داعم</h3><p>إضافة رابط خرائط Google أو موقع رسمي أو مصدر عام تساعد في التحقق، لكنها لا تجعل التعديل منشورًا تلقائيًا.</p></article>
          </div>
        </div>
      </section>

      <section className="shell page-section">
        <div className="detail-card">
          <div className="detail-card__heading"><span className="eyebrow eyebrow--dark">قياس الأداء</span><h2>Vercel Speed Insights</h2></div>
          <p>نستخدم Speed Insights لمتابعة مؤشرات أداء الويب مثل سرعة التحميل وتجربة الاستخدام. هذا القياس منفصل عن قاعدة طلبات ومؤشرات نمو الدليل، ويُستخدم لتحسين الأداء التقني.</p>
          <p style={{ marginTop: 12 }}>قد تتغير الأدوات التقنية مع تطوير المشروع، وسنحدّث هذه الصفحة إذا تغيّر نوع البيانات التي نعالجها بصورة جوهرية.</p>
        </div>
      </section>

      <section className="section section--muted">
        <div className="shell methodology">
          <div><span className="eyebrow eyebrow--dark">التواصل والتصحيح</span><h2>طلب مراجعة بياناتك</h2><p>إذا أرسلت وسيلة تواصل اختيارية في مساهمة وتريد تصحيحها أو حذفها، استخدم نموذج التصحيح واذكر مرجع الطلب إن كان متاحًا.</p><Link href="/contribute?type=correction" className="button button--primary">إرسال طلب تصحيح</Link></div>
          <div className="methodology__grid">
            <article><b>أ</b><h3>الدليل مستقل</h3><p>دليل نقادة منصة معلوماتية مستقلة وليست جهة حكومية أو ممثلًا للأنشطة المدرجة.</p></article>
            <article><b>ب</b><h3>تقليل البيانات</h3><p>نفضل المصادر العامة والمعلومات اللازمة للمراجعة، ولا نطلب بيانات حساسة لإضافة نشاط أو تصحيح سجل.</p></article>
            <article><b>ج</b><h3>آخر تحديث</h3><p>تم تحديث هذه الصفحة في 4 سبتمبر 2026.</p></article>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
