import Link from 'next/link';
import Image from 'next/image';
import { DeferredFeatureWidget } from './deferred-feature-widget';
import type { FeaturedRoleModel } from './role-model-feature';
import feature from './role-model-feature.module.css';

export function DeferredRoleModelFeature({ people }: { people: FeaturedRoleModel[] }) { if (!people.length) return null; const person=people[0], activeIndex=0, autoPlaying=true, announcement=""; return <DeferredFeatureWidget people={people}><section
    className={'shell ' + feature.homeFeature}
    aria-labelledby="home-role-model-title"
  >
    <div className={feature.homeFeatureCopy}>
      <div key={person.slug} className={feature.homeFeatureSlideCopy}>
        <span>نماذج مشرفة · من أهل نقادة</span>
        <h2 id="home-role-model-title">{person.name}</h2>
        <p>{person.shortTitle}.</p>
        <Link prefetch={false} href={'/role-models/' + person.slug}>اقرأ الحكاية <span aria-hidden="true">←</span></Link>
        <Link prefetch={false} href="/role-models" className={feature.homeSecondary}>كل النماذج المشرفة</Link>
      </div>
      {people.length > 1 && <div className={feature.featureControls} aria-label="التنقل بين النماذج المشرفة">
        <span className={feature.featureCount} aria-hidden="true">{String(activeIndex + 1).padStart(2, '0')} <span>/</span> {String(people.length).padStart(2, '0')}</span>
        <div className={feature.featureButtons}>
          <button type="button" aria-label="الشخصية السابقة">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" aria-label="الشخصية التالية">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" aria-label={autoPlaying ? 'إيقاف العرض التلقائي' : 'تشغيل العرض التلقائي'} aria-pressed={!autoPlaying}>
            {autoPlaying
              ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 4.8a1 1 0 0 1 1.52-.85l11 7.2a1 1 0 0 1 0 1.7l-11 7.2A1 1 0 0 1 7 19.2V4.8Z" /></svg>}
          </button>
        </div>
      </div>}
      <span className={feature.featureAnnouncement} aria-live="polite" aria-atomic="true">{announcement}</span>
    </div>
    <div key={person.slug} className={feature.homeFeatureVisual}>
      {person.photo
        ? <Image unoptimized={person.photo.src.startsWith('/api/article-media/')} src={person.photo.src} alt={person.photo.alt} width={person.photo.width} height={person.photo.height} sizes="(max-width: 700px) calc(100vw - 32px), 32vw" style={person.photo.cardPosition ? { objectPosition: person.photo.cardPosition } : undefined} />
        : <span className={feature.monogram} aria-hidden="true">{person.name.slice(0, 1)}</span>}
      <small>{person.name} · {person.locality}</small>
    </div>
  </section></DeferredFeatureWidget>; }
