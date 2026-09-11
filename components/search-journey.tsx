import Link from 'next/link';
import type { SearchJourney, SearchJourneyLink } from '@/lib/search-journey';
import styles from './search-journey.module.css';

function JourneyCards({ items }: { items: SearchJourneyLink[] }) {
  return (
    <div className={styles.cards}>
      {items.map((item) => (
        <Link key={`${item.badge}-${item.href}`} href={item.href} prefetch={false} className={styles.card}>
          <span className={styles.badge}>{item.badge}</span>
          <strong>{item.title}</strong>
          <small>{item.subtitle}</small>
          <span className={styles.cardAction}>استكشف ←</span>
        </Link>
      ))}
    </div>
  );
}

export function SearchJourneyPanel({ journey }: { journey: SearchJourney }) {
  const steps = [
    {
      id: 'route',
      number: '01',
      title: 'المسار المحلي الحالي',
      description: `ابدأ من صفحة ${journey.categoryLabel} المجمّعة في ${journey.locality}.`,
      items: [journey.currentRoute],
    },
    journey.relatedServices.length ? {
      id: 'related',
      number: '02',
      title: `خدمات مرتبطة داخل ${journey.locality}`,
      description: 'اقتراحات من المجال نفسه، ولا تظهر إلا عند وجود نتائج منشورة فعلًا داخل الموضع.',
      items: journey.relatedServices,
    } : null,
    journey.sameScopePlaces.length ? {
      id: 'scope',
      number: '03',
      title: 'قرى ونجوع ضمن النطاق الإداري نفسه',
      description: journey.scope
        ? `مواضع تشترك مع ${journey.locality} في «${journey.scope}». هذه علاقة إدارية وخدمية وليست ترتيبًا حسب المسافة.`
        : 'مواضع تشترك في النطاق الإداري نفسه؛ لا نعرضها على أنها الأقرب دون إحداثيات موثقة.',
      items: journey.sameScopePlaces,
    } : null,
    journey.sameServiceElsewhere.length ? {
      id: 'elsewhere',
      number: '04',
      title: `${journey.serviceLabel} في مواضع أخرى`,
      description: 'استكشف الخدمة نفسها في قرية أو نجع آخر، مرتبة حسب عدد النتائج المنشورة لا حسب المسافة.',
      items: journey.sameServiceElsewhere,
    } : null,
  ].filter(Boolean) as Array<{ id: string; number: string; title: string; description: string; items: SearchJourneyLink[] }>;

  return (
    <section className={styles.journey} aria-labelledby="search-journey-title">
      <header className={styles.header}>
        <div>
          <span>رحلة البحث المحلية</span>
          <h2 id="search-journey-title">استكشف ما بعد «{journey.serviceLabel} في {journey.locality}»</h2>
          <p>نرتّب لك خطوات تالية مبنية على البيانات المنشورة والعلاقات الإدارية الموجودة في الدليل، بدل أن تتوقف التجربة عند قائمة نتائج فقط.</p>
        </div>
        <div className={styles.legend} aria-label="مبادئ رحلة البحث">
          <span>بيانات منشورة</span>
          <span>بدون تخمين مسافة</span>
          <span>بدون API مدفوع</span>
        </div>
      </header>

      <div className={styles.steps}>
        {steps.map((step) => (
          <section className={styles.step} key={step.id} aria-label={step.title}>
            <div className={styles.stepHead}>
              <b>{step.number}</b>
              <div><strong>{step.title}</strong><p>{step.description}</p></div>
            </div>
            <JourneyCards items={step.items} />
          </section>
        ))}
      </div>
    </section>
  );
}
