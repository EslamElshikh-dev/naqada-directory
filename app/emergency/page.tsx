import type { Metadata } from 'next';
import Link from 'next/link';
import { CategoryVisual } from '@/components/category-visual';

export const metadata: Metadata = {
  title: 'أرقام الطوارئ والخدمات المهمة',
  description: 'أرقام الإسعاف والنجدة والمطافئ والكهرباء والمياه والغاز والخدمات المهمة للاستخدام السريع داخل نقادة.',
  alternates: { canonical: '/emergency' },
};

const contacts = [
  { name: 'الإسعاف', number: '123', type: 'طوارئ صحية', description: 'للحوادث والحالات الطبية العاجلة.' },
  { name: 'شرطة النجدة', number: '122', type: 'طوارئ أمنية', description: 'للبلاغات والمساعدة الأمنية العاجلة.' },
  { name: 'المطافئ', number: '180', type: 'حماية مدنية', description: 'للحرائق وحوادث الإنقاذ والحماية المدنية.' },
  { name: 'طوارئ الصحة', number: '105', type: 'خدمة صحية', description: 'للاستفسارات والبلاغات الصحية الرسمية.' },
  { name: 'أعطال الكهرباء', number: '121', type: 'مرافق', description: 'للإبلاغ عن الأعطال ومشكلات الكهرباء.' },
  { name: 'مياه الشرب', number: '125', type: 'مرافق', description: 'للشكاوى والأعطال المتعلقة بالمياه والصرف.' },
  { name: 'طوارئ الغاز', number: '129', type: 'مرافق', description: 'للإبلاغ الفوري عن تسربات أو طوارئ الغاز.' },
  { name: 'شرطة المرور', number: '128', type: 'مرور', description: 'للبلاغات والاستفسارات المرتبطة بالمرور.' },
  { name: 'نجدة الطفل', number: '16000', type: 'حماية اجتماعية', description: 'للبلاغات المتعلقة بحماية الأطفال.' },
];

export default function EmergencyPage() {
  const structuredData = { '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: contacts.length, itemListElement: contacts.map((item, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'ContactPoint', name: item.name, contactType: item.type, telephone: item.number, areaServed: 'EG', availableLanguage: 'ar' } })) };
  return (
    <main id="main-content" className="page-main">
      <section className="emergency-hero"><div className="shell emergency-hero__grid"><div><nav className="breadcrumbs"><Link href="/">الرئيسية</Link><span>/</span><span>أرقام مهمة</span></nav><span className="eyebrow">للحالات العاجلة</span><h1>أرقام مهمة <em>وسريعة</em></h1><p>اضغط على الرقم للاتصال مباشرة، واستخدم أرقام الطوارئ فقط عند الحاجة الفعلية.</p></div><CategoryVisual category="emergency" size="lg" /></div></section>
      <section className="shell page-section"><div className="emergency-grid">{contacts.map((item) => <a href={`tel:${item.number}`} key={item.number} className="emergency-card"><span>{item.type}</span><h2>{item.name}</h2><p>{item.description}</p><strong>{item.number}</strong><small>اضغط للاتصال</small></a>)}</div><div className="official-note"><b>مصدر الأرقام:</b> دليل أرقام الطوارئ والخدمات العامة المنشور على بوابة حكومية مصرية، مع مصادر المرافق المختصة. <a href="https://kfs.gov.eg/directory" target="_blank" rel="noreferrer">راجع المصدر ↗</a></div></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
