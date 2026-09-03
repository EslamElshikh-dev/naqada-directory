import type { Metadata } from 'next';
import Link from 'next/link';
import { meta } from '@/lib/data';

export const metadata: Metadata = {
  title: 'عن دليل نقادة ومنهج البيانات',
  description: 'تعرف على نطاق دليل نقادة، درجات التوثيق، قواعد نشر بيانات الخدمات والعائلات والتراث، وطريقة اقتراح التصحيحات.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main id="main-content" className="page-main">
      <section className="about-hero"><div className="shell"><nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>عن الدليل</span></nav><span className="eyebrow">كيف نعمل</span><h1>دليل محلي يفصل بين <em>المعلومة والاستنتاج</em></h1><p>الهدف هو تسهيل الوصول إلى خدمات ومكان وذاكرة نقادة، مع إظهار حدود البيانات بدل تقديمها كحقائق مطلقة.</p></div></section>
      <section className="shell about-layout">
        <article className="prose-card"><span className="eyebrow eyebrow--dark">نطاق الإصدار الحالي</span><h2>ماذا يعرض الموقع؟</h2><p>يجمع الإصدار الحالي {meta.businessCount.toLocaleString('ar-EG')} نشاطًا وخدمة، و{meta.localityCount.toLocaleString('ar-EG')} موضعًا جغرافيًا، و{meta.familyCount.toLocaleString('ar-EG')} سجل عائلة أو فرع تاريخي، إضافة إلى {(meta.peopleCount + meta.landmarkCount).toLocaleString('ar-EG')} سجلًا بين شخصية ومعلم.</p><p>العدد المنشور ليس حصرًا لكل ما يوجد واقعيًا في المركز، بل هو ما اجتاز معيار النشر في هذه المرحلة.</p></article>
        <div className="principles-grid"><article><b>A</b><h3>دليل قوي</h3><p>مصدر رسمي أو تاريخي قوي، أو أكثر من مصدر مستقل ومباشر.</p></article><article><b>B</b><h3>دليل جيد</h3><p>مادة مباشرة قابلة للنشر، مع نقص في التثبيت الرسمي أو المستقل الكامل.</p></article><article><b>C</b><h3>يحتاج مراجعة</h3><p>قرينة منفردة لا تُعرض عادة في السجل العام حتى يكتمل دعمها.</p></article></div>
        <article className="prose-card"><span className="eyebrow eyebrow--dark">قواعد لا نتجاوزها</span><h2>ما الذي لا نستنتجه؟</h2><ul><li>لا نستخرج اسم عائلة من اسم قرية أو عزبة.</li><li>لا نربط عائلتين لمجرد تشابه اللقب.</li><li>لا نحول مكان العمل إلى محل ميلاد أو أصل عائلي.</li><li>لا نعتبر اسم شخص في سجل نشاط دليلًا على عائلة كاملة.</li><li>لا ننقل تفاصيل حساسة أو نزاعات إلى صفحات العائلات.</li></ul></article>
        <article className="prose-card" id="updates"><span className="eyebrow eyebrow--dark">التحديث والتصحيح</span><h2>كيف يُراجع السجل؟</h2><p>أي تصحيح ينبغي أن يحدد اسم السجل، المعلومة المطلوب تعديلها، ومصدرًا عامًا مباشرًا يدعم التعديل. لا تُقبل صلات النسب أو التبعيات المكانية المبنية على الاستنتاج وحده.</p><p>حتى تُضاف قناة استقبال عامة داخل الموقع، يمكن إرسال الملاحظات إلى صاحب المشروع عبر موقعه المهني.</p><a className="button button--primary" href="https://eslam-elshikh.com/" target="_blank" rel="noreferrer">التواصل مع المطور ↗</a></article>
      </section>
    </main>
  );
}
