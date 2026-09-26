'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { RoleModelPhoto } from '@/lib/role-models';
import styles from '@/app/role-models/role-models.module.css';

export type FeaturedRoleModel = {
  slug: string;
  name: string;
  locality: string;
  shortTitle: string;
  photo?: RoleModelPhoto;
};

export function RoleModelFeature({ people }: { people: FeaturedRoleModel[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageActive, setPageActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => setReducedMotion(media.matches);
    onPreferenceChange();
    media.addEventListener('change', onPreferenceChange);
    return () => media.removeEventListener('change', onPreferenceChange);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(section);
    const onVisibilityChange = () => setPageActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (people.length < 2 || paused || userPaused || !visible || !pageActive || (reducedMotion && !playRequested)) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % people.length), 3000);
    return () => window.clearInterval(timer);
  }, [activeIndex, pageActive, paused, people.length, playRequested, reducedMotion, userPaused, visible]);

  if (!people.length) return null;
  const person = people[activeIndex % people.length];
  const autoPlaying = !userPaused && (!reducedMotion || playRequested);

  function move(step: number) {
    const nextIndex = (activeIndex + step + people.length) % people.length;
    setActiveIndex(nextIndex);
    setAnnouncement(`القصة ${nextIndex + 1} من ${people.length}: ${people[nextIndex].name}`);
  }

  return <section
    ref={sectionRef}
    className={'shell ' + styles.homeFeature}
    aria-labelledby="home-role-model-title"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
  >
    <div className={styles.homeFeatureCopy}>
      <div key={person.slug} className={styles.homeFeatureSlideCopy}>
        <span>نماذج مشرفة · من أهل نقادة</span>
        <h2 id="home-role-model-title">{person.name}</h2>
        <p>{person.shortTitle}.</p>
        <Link prefetch={false} href={'/role-models/' + person.slug}>اقرأ الحكاية <span aria-hidden="true">←</span></Link>
        <Link prefetch={false} href="/role-models" className={styles.homeSecondary}>كل النماذج المشرفة</Link>
      </div>
      {people.length > 1 && <div className={styles.featureControls} aria-label="التنقل بين النماذج المشرفة">
        <span className={styles.featureCount} aria-hidden="true">{String(activeIndex + 1).padStart(2, '0')} <span>/</span> {String(people.length).padStart(2, '0')}</span>
        <div className={styles.featureButtons}>
          <button type="button" onClick={() => move(-1)} aria-label="الشخصية السابقة">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => move(1)} aria-label="الشخصية التالية">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => { setUserPaused(autoPlaying); if (!autoPlaying) setPlayRequested(true); }} aria-label={autoPlaying ? 'إيقاف العرض التلقائي' : 'تشغيل العرض التلقائي'} aria-pressed={!autoPlaying}>
            {autoPlaying
              ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 4.8a1 1 0 0 1 1.52-.85l11 7.2a1 1 0 0 1 0 1.7l-11 7.2A1 1 0 0 1 7 19.2V4.8Z" /></svg>}
          </button>
        </div>
      </div>}
      <span className={styles.featureAnnouncement} aria-live="polite" aria-atomic="true">{announcement}</span>
    </div>
    <div key={person.slug} className={styles.homeFeatureVisual}>
      {person.photo
        ? <Image src={person.photo.src} alt={person.photo.alt} width={person.photo.width} height={person.photo.height} sizes="(max-width: 700px) calc(100vw - 32px), 32vw" style={person.photo.cardPosition ? { objectPosition: person.photo.cardPosition } : undefined} />
        : <span className={styles.monogram} aria-hidden="true">{person.name.slice(0, 1)}</span>}
      <small>{person.name} · {person.locality}</small>
    </div>
  </section>;
}
