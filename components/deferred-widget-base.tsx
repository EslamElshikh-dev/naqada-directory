'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { FeaturedRoleModel } from './role-model-feature';
const Placeholder = createContext<ReactNode>(null);
const Ready = createContext<() => void>(() => {});
export function Loading() { return useContext(Placeholder); }
export function mounted<P extends object>(Component: ComponentType<P>) {
  return function Loaded(props: P) { const ready = useContext(Ready); useEffect(ready, [ready]); return <Component {...props} />; };
}
export type DeferredState = {
  kind: 'sanad' | 'notifications' | 'ticker' | 'feature' | 'preferences';
  interacted: boolean;
  consent?: 'granted' | 'denied';
  featureStep: number;
  people?: FeaturedRoleModel[];
};
export function DeferredWidgetBase({ kind, children, people, render }: {
  kind: DeferredState['kind']; children: ReactNode; people?: FeaturedRoleModel[];
  render: (state: DeferredState) => ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false), [interacted, setInteracted] = useState(false), [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<'granted' | 'denied'>();
  const [featureStep, setFeatureStep] = useState(0);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (active) return;
    if (kind === 'feature' || kind === 'preferences') {
      const target = root.current?.firstElementChild; if (!target) return;
      const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setActive(true); observer.disconnect(); } }, { rootMargin: '250px' });
      observer.observe(target); return () => observer.disconnect();
    }
    let timer: ReturnType<typeof setTimeout>, idle: number | undefined;
    const schedule = () => { timer = setTimeout(() => { if ('requestIdleCallback' in window) idle = window.requestIdleCallback(() => setActive(true), { timeout: 1500 }); else setActive(true); }, kind === 'ticker' ? 1600 : kind === 'sanad' ? 6000 : 3500); };
    const hash = () => { if (kind === 'sanad' && location.hash === '#sanad') { setInteracted(true); setActive(true); } };
    const first = setTimeout(hash, 0); window.addEventListener('hashchange', hash);
    if (document.readyState === 'complete') schedule(); else window.addEventListener('load', schedule, { once: true });
    return () => { clearTimeout(first); clearTimeout(timer); if (idle !== undefined) window.cancelIdleCallback(idle); window.removeEventListener('load', schedule); window.removeEventListener('hashchange', hash); };
  }, [active, kind]);
  return <div ref={root} style={{ display: 'contents' }} onClickCapture={event => {
    if (ready) return;
    if (event.target instanceof Element) {
      const button = event.target.closest('button');
      if (kind === 'preferences') { const text = button?.textContent; if (text?.includes('السماح')) setConsent('granted'); if (text?.includes('رفض')) setConsent('denied'); }
      if (kind === 'feature') { const label = button?.getAttribute('aria-label'); if (label === 'الشخصية التالية') setFeatureStep(1); if (label === 'الشخصية السابقة') setFeatureStep(-1); }
    }
    setInteracted(true); setActive(true);
  }}><Ready.Provider value={onReady}><Placeholder.Provider value={children}>{active ? render({ kind, interacted, consent, featureStep, people }) : children}</Placeholder.Provider></Ready.Provider></div>;
}
