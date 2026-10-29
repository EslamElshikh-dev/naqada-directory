'use client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { DeferredWidgetBase, Loading, mounted, type DeferredState } from './deferred-widget-base';
const Sanad = dynamic<{ initialOpen?: boolean }>(() => import('./sanad-assistant').then(m => mounted(m.SanadAssistant)), { ssr: false, loading: Loading });
const Notifications = dynamic<{ initialOpen?: boolean }>(() => import('./header-notifications').then(m => mounted(m.HeaderNotifications)), { ssr: false, loading: Loading });
const Ticker = dynamic<{ initialPaused?: boolean }>(() => import('./updates-ticker').then(m => mounted(m.UpdatesTicker)), { ssr: false, loading: Loading });
function renderWidget({ kind, interacted }: DeferredState) {
  if (kind === 'sanad') return <Sanad initialOpen={interacted} />;
  if (kind === 'notifications') return <Notifications initialOpen={interacted} />;
  return <Ticker initialPaused={interacted} />;
}
export function DeferredWidget({ kind, children }: { kind: 'sanad' | 'notifications' | 'ticker'; children: ReactNode }) {
  return <DeferredWidgetBase kind={kind} render={renderWidget}>{children}</DeferredWidgetBase>;
}
