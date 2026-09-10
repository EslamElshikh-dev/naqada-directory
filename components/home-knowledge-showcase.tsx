import Image from 'next/image';
import Link from 'next/link';
import {
  fieldInformants,
  knowledgeHeritage,
  knowledgePeople,
  knowledgePlaces,
  knowledgeReferences,
  primaryKnowledgeContributor,
} from '@/lib/knowledge';
import styles from './home-knowledge-showcase.module.css';

type ShowcaseCard = {
  eyebrow: string;
  value: string;
  unit: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  image: string;
  alt: string;
  featured?: boolean;
};

export function HomeKnowledgeShowcase() {
  const cards: ShowcaseCard[] = [
    {
      eyebrow: 'خريطة المكان',
      value: knowledgePlaces.length.toLocaleString('ar-EG'),
      unit: 'موضعًا',
      title: 'من المدينة إلى أصغر نجع',
      description: `${knowledgePlaces.slice(0, 6).map((item) => item.shortName || item.name).join('، ')}… خريطة معرفية تربط الاسم بسياقه ومصدره.`,
      href: '/knowledge/places',
      cta: 'استكشف الأماكن',
      image: '/images/landmarks/naqada-city.webp',
      alt: 'مشهد من مدينة نقادة ضمن المادة البصرية للموقع',
      featured: true,
    },
    {
      eyebrow: 'أعلام نقادة',
      value: knowledgePeople.length.toLocaleString('ar-EG'),
      unit: 'شخصية',
      title: 'أسماء صنعت ذاكرة المكان',
      description: `${knowledgePeople.slice(0, 4).map((item) => item.name).join('، ')}، وغيرهم من الأعلام المرتبطين بنقادة وقراها.`,
      href: '/knowledge/people',
      cta: 'استكشف الأعلام',
      image: '/images/categories/community.webp',
      alt: 'صورة توضيحية تمثل المجتمع والأعلام في موسوعة نقادة',
    },
    {
      eyebrow: 'التراث والمعالم',
      value: knowledgeHeritage.length.toLocaleString('ar-EG'),
      unit: 'موضوعًا',
      title: 'حكايات وآثار وذاكرة محلية',
      description: `${knowledgeHeritage.slice(0, 4).map((item) => item.name).join('، ')}… موضوعات مفصولة عن بيانات الأنشطة الحديثة.`,
      href: '/knowledge/heritage',
      cta: 'استكشف التراث',
      image: '/images/landmarks/naqada-royal-tomb.webp',
      alt: 'صورة من السجل البصري لمعالم وتراث نقادة',
    },
    {
      eyebrow: 'المراجع',
      value: knowledgeReferences.length.toLocaleString('ar-EG'),
      unit: 'مرجعًا',
      title: 'الفهرس وراء المعلومة',
      description: 'طبقة مستقلة للمراجع توضح المصادر التي استند إليها المؤلف وتفصل المرجع عن النص المنشور في الموسوعة.',
      href: '/knowledge/references',
      cta: 'عرض المراجع',
      image: '/images/categories/education.webp',
      alt: 'صورة توضيحية للكتب والمراجع المستخدمة في الموسوعة',
    },
    {
      eyebrow: 'العمل الميداني',
      value: fieldInformants.length.toLocaleString('ar-EG'),
      unit: 'اسمًا',
      title: 'شهادات ومساعدات من الميدان',
      description: 'أسماء المقابلات والمساعدات الميدانية الواردة في المصدر مع نطاقها الجغرافي، دون نشر بيانات اتصال شخصية.',
      href: '/knowledge/fieldwork',
      cta: 'عرض العمل الميداني',
      image: '/images/landmarks/deir-mikhail-entrance.webp',
      alt: 'مشهد محلي من نقادة يرمز إلى العمل الميداني وتوثيق المكان',
    },
    {
      eyebrow: 'منهج الإسناد',
      value: 'المصدر',
      unit: 'ظاهر',
      title: 'تعرف أصل المعلومة قبل أن تعتمدها',
      description: 'المواد المستخرجة من الكتاب ومصادره تحمل إسنادًا واضحًا، مع إظهار سنة المعلومة التاريخية متى كانت متاحة.',
      href: `/contributors/${primaryKnowledgeContributor.slug}`,
      cta: 'عن المساهم والمصادر',
      image: '/images/landmarks/deir-mikhail-churches.webp',
      alt: 'صورة من السجل البصري لنقادة ضمن واجهة منهج الإسناد',
    },
  ];

  return (
    <section className={styles.section} aria-labelledby="home-knowledge-title">
      <div className="shell">
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.kicker}>من موسوعة نقادة المرجعية</span>
            <h2 id="home-knowledge-title">المكان والناس والتراث… <em>ومع كل معلومة أصلها</em></h2>
            <p>تجربة معرفية داخل الدليل نفسه، تفصل التاريخ والتراث عن البيانات التجارية الحديثة وتُظهر المساهم والمصدر بوضوح.</p>
          </div>
          <Link href="/knowledge" className={styles.primaryCta} prefetch={false}>
            <span>فتح موسوعة نقادة</span><b aria-hidden="true">←</b>
          </Link>
        </header>

        <div className={styles.attribution}>
          <div className={styles.attributionMedia} aria-hidden="true">
            <div className={styles.photoMain}><Image src="/images/landmarks/naqada-city.webp" alt="" fill sizes="(max-width: 760px) 100vw, 360px" /></div>
            <div className={styles.photoSecondary}><Image src="/images/landmarks/naqada-royal-tomb.webp" alt="" fill sizes="180px" /></div>
            <span className={styles.seal}>أد</span>
          </div>
          <div className={styles.attributionCopy}>
            <div className={styles.attributionMeta}>
              <span>المساهم المرجعي</span>
              <b>{primaryKnowledgeContributor.role}</b>
            </div>
            <h3>المادة المرجعية بمساهمة الأستاذ أحمد الدعباسي</h3>
            <p>مؤلف «{primaryKnowledgeContributor.primaryWork}». تُنسب إليه المواد المستخرجة من كتابه ومصادره داخل الصفحات التي تستخدمها، مع إبقاء الإسناد ظاهرًا للمستخدم.</p>
            <div className={styles.metaRow}>
              <span>تأليف ومادة مرجعية</span>
              <span>إسناد داخل الصفحات</span>
              <span>فصل التاريخ عن التجاري</span>
            </div>
            <Link href={`/contributors/${primaryKnowledgeContributor.slug}`} prefetch={false}>عرض ملف المساهم <b aria-hidden="true">←</b></Link>
          </div>
        </div>

        <div className={styles.grid}>
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              prefetch={false}
              className={`${styles.card} ${card.featured ? styles.cardFeatured : ''}`}
            >
              <div className={styles.media}>
                <Image src={card.image} alt={card.alt} fill sizes={card.featured ? '(max-width: 760px) 100vw, 58vw' : '(max-width: 760px) 100vw, 32vw'} />
                <div className={styles.mediaShade} aria-hidden="true" />
                <span className={styles.badge}>{card.eyebrow}</span>
                <div className={styles.stat}><strong>{card.value}</strong><small>{card.unit}</small></div>
              </div>
              <div className={styles.body}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <span className={styles.cardCta}>{card.cta}<b aria-hidden="true">←</b></span>
              </div>
            </Link>
          ))}
        </div>

        <footer className={styles.footer}>
          <div><span>طبقات معرفة منفصلة</span><strong>مكان · أعلام · تراث · مراجع · ميدان · إسناد</strong></div>
          <p>المعلومة التاريخية لا تتحول تلقائيًا إلى بيانات نشاط، وظهور المصدر جزء من تجربة القراءة نفسها.</p>
        </footer>
      </div>
    </section>
  );
}
