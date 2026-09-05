import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ActionIcon } from '@/components/action-icon';
import { jsonLdStringify, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'معالم نقادة السياحية والأثرية بالصور',
  description: 'اكتشف أشهر معالم نقادة بالصور: دير الملاك ميخائيل، ذاكرة مدينة نوبت ومقبرة نقادة الملكية، ومسار إلى سجل المعالم الموثق.',
  keywords: ['معالم نقادة', 'السياحة في نقادة', 'آثار نقادة', 'دير الملاك ميخائيل نقادة', 'دير الصليب نقادة', 'حضارة نقادة'],
  alternates: { canonical: '/landmarks' },
  openGraph: {
    title: 'معالم نقادة السياحية والأثرية بالصور',
    description: 'جولة بصرية موثقة في أشهر مواقع نقادة وذاكرتها الأثرية.',
    url: '/landmarks',
    images: [{ url: '/images/landmarks/deir-mikhail-churches.webp', width: 800, height: 530, alt: 'واجهة كنائس دير الملاك ميخائيل قرب نقادة' }],
  },
};

const gallery = [
  {
    title: 'دير الملاك ميخائيل',
    tag: 'عمارة قبطية',
    place: 'جنوب نقادة · محافظة قنا',
    description: 'مجموعة معمارية مميزة جنوب نقادة؛ توثق الصور واجهة الكنائس المبنية بالطوب اللبن وبساطة التكوين المتناغم مع بيئة الصعيد.',
    image: '/images/landmarks/deir-mikhail-churches.webp',
    alt: 'واجهة كنائس دير الملاك ميخائيل جنوب نقادة',
    source: 'https://commons.wikimedia.org/wiki/File:DeirMikhailNaqadaChurches.jpg',
    credit: 'Roland Unger · CC BY-SA 3.0',
    featured: true,
  },
  {
    title: 'بوابة مدينة نقادة',
    tag: 'هوية المكان',
    place: 'مدينة نقادة',
    description: 'لقطة حديثة من مدخل المدينة؛ بداية بصرية مناسبة لاكتشاف المكان الذي منح اسمه لإحدى أهم مراحل ما قبل الأسرات.',
    image: '/images/landmarks/naqada-city.webp',
    alt: 'لافتة ترحيب بمدينة نقادة وسط النخيل',
    source: 'https://commons.wikimedia.org/wiki/File:MbgIMG_0411.jpg',
    credit: 'Dr-Vivoo · CC BY-SA 4.0',
  },
  {
    title: 'الكنيسة داخل الدير',
    tag: 'تفاصيل معمارية',
    place: 'دير الملاك ميخائيل',
    description: 'المشهد الداخلي يبرز العقود المتتابعة وتقسيم الفراغ والأيقونستاس في قلب الكنيسة.',
    image: '/images/landmarks/deir-mikhail-church.webp',
    alt: 'الكنيسة من الداخل في دير الملاك ميخائيل قرب نقادة',
    source: 'https://commons.wikimedia.org/wiki/File:DeirMikhailNaqadaChurch1.jpg',
    credit: 'Roland Unger · CC BY-SA 3.0',
  },
  {
    title: 'المقبرة الملكية في نقادة',
    tag: 'وثيقة أثرية',
    place: 'نقادة القديمة',
    description: 'رسم توثيقي تاريخي للمقبرة نشره عالم الآثار جاك دي مورجان سنة 1897؛ وهو وثيقة أرشيفية وليس صورة للموقع في وضعه الحالي.',
    image: '/images/landmarks/naqada-royal-tomb.webp',
    alt: 'رسم تاريخي لمقبرة نقادة الملكية نشر عام 1897',
    source: 'https://commons.wikimedia.org/wiki/File:Tombe-Nagada-de-Morgan.jpg',
    credit: 'Jacques de Morgan · ملكية عامة',
  },
];

const routeStops = [
  { number: '01', title: 'دير الملاك ميخائيل', text: 'الموقع الأكثر حضورًا بصريًا في المصادر المفتوحة، ويقع جنوب مدينة نقادة.' },
  { number: '02', title: 'دير الصليب بحاجر دنفيق', text: 'معلم قبطي معروف في نطاق مركز نقادة؛ يفضّل التأكد من مواعيد الزيارة قبل التحرك.' },
  { number: '03', title: 'نوبت ونقادة القديمة', text: 'مساحة الذاكرة الأثرية المرتبطة بثقافة نقادة ومراحل ما قبل الأسرات.' },
];

export default function LandmarksPage() {
  const pageUrl = `${siteConfig.url}/landmarks/`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'معالم نقادة السياحية والأثرية بالصور',
    url: pageUrl,
    inLanguage: 'ar-EG',
    about: { '@type': 'Place', name: 'مركز نقادة، محافظة قنا، مصر' },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: gallery.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        image: `${siteConfig.url}${item.image}`,
      })),
    },
  };

  return (
    <main id="main-content" className="landmarks-page">
      <section className="landmark-hero">
        <Image className="landmark-hero__image" src="/images/landmarks/deir-mikhail-entrance.webp" alt="مدخل دير الملاك ميخائيل جنوب نقادة" fill priority sizes="100vw" />
        <div className="landmark-hero__veil" aria-hidden="true" />
        <div className="shell landmark-hero__content">
          <div>
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>/</span><span>معالم نقادة</span></nav>
            <span className="landmark-hero__eyebrow"><i /> دليل بصري موثّق</span>
            <h1>معالم نقادة… <em>حكاية مكان</em> تمتد لآلاف السنين.</h1>
            <p>جولة مختصرة في العمارة القبطية وذاكرة نوبت وحضارة نقادة، بصور مفتوحة الترخيص وروابط مباشرة إلى مصادرها.</p>
            <div className="landmark-hero__actions"><a href="#gallery" className="button button--light"><ActionIcon name="landmark" /><span>ابدأ الجولة</span></a><Link href="/heritage" className="button button--outline-light"><ActionIcon name="arrow" /><span>السجل التراثي الكامل</span></Link></div>
          </div>
          <aside><span>هوية نقادة</span><strong>مدينة صنعت اسمًا أثريًا عالميًا</strong><p>مناظر حقيقية ووثائق تاريخية، مع تمييز واضح بين الصورة الحديثة والرسم الأرشيفي.</p><div><b>٤<small>مشاهد مختارة</small></b><b>٣<small>محطات للزيارة</small></b></div></aside>
        </div>
      </section>

      <section className="shell landmarks-intro">
        <div><span className="eyebrow eyebrow--dark">اكتشف نقادة</span><h2>المكان أقرب عندما ترى تفاصيله</h2></div>
        <p>رتبنا الصور كمجموعة تحريرية هادئة: صورة كبيرة للمشهد الأهم، ثم تفاصيل المكان والذاكرة الأثرية. اضغط على «مصدر الصورة» لمراجعة بيانات المصور والترخيص.</p>
      </section>

      <section className="shell landmark-gallery" id="gallery" aria-label="صور معالم نقادة">
        {gallery.map((item) => (
          <article className={`landmark-card${item.featured ? ' landmark-card--featured' : ''}`} key={item.title}>
            <div className="landmark-card__media">
              <Image src={item.image} alt={item.alt} fill sizes={item.featured ? '(max-width: 760px) 100vw, 66vw' : '(max-width: 760px) 100vw, 33vw'} />
              <span>{item.tag}</span>
            </div>
            <div className="landmark-card__content"><small>{item.place}</small><h2>{item.title}</h2><p>{item.description}</p><a href={item.source} target="_blank" rel="noreferrer">مصدر الصورة والترخيص <span>↗</span></a><em>{item.credit}</em></div>
          </article>
        ))}
      </section>

      <section className="section landmark-route">
        <div className="shell landmark-route__grid">
          <div className="landmark-route__intro"><span className="eyebrow">مسار مقترح</span><h2>ثلاث محطات لفهم روح المكان</h2><p>هذه ليست مواعيد تشغيل أو برنامج رحلة رسميًا؛ هي نقطة بداية لتجميع أهم الأسماء قبل الزيارة.</p><Link href="/directory" className="button button--light"><ActionIcon name="map" /><span>ابحث عن خدمات قريبة</span></Link></div>
          <ol>{routeStops.map((stop) => <li key={stop.number}><b>{stop.number}</b><div><h3>{stop.title}</h3><p>{stop.text}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="shell landmarks-next"><div><span>سجل أكبر من الصور</span><h2>تابع المعالم والأعلام بمصادرها</h2><p>صفحة الذاكرة تجمع السجل التفصيلي ودرجة كل معلومة وروابط توثيقها.</p></div><Link href="/heritage" className="button button--primary"><ActionIcon name="arrow" /><span>افتح ذاكرة نقادة</span></Link></section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(structuredData) }} />
    </main>
  );
}
