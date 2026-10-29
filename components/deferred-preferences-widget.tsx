'use client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { DeferredWidgetBase, Loading, mounted, type DeferredState } from './deferred-widget-base';
const Preferences = dynamic<{ initialChoice?: 'granted' | 'denied' }>(() => import('./privacy-preferences').then(m => mounted(m.PrivacyPreferences)), { ssr: false, loading: Loading });
function renderWidget({ consent }: DeferredState) { return <Preferences initialChoice={consent} />; }
export function DeferredPreferencesWidget({ children }: { children: ReactNode }) {
  return <DeferredWidgetBase kind="preferences" render={renderWidget}>{children}</DeferredWidgetBase>;
}
