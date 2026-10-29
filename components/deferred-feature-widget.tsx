'use client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import type { FeaturedRoleModel } from './role-model-feature';
import { DeferredWidgetBase, Loading, mounted, type DeferredState } from './deferred-widget-base';
const Feature = dynamic(() => import('./role-model-feature').then(m => mounted(m.RoleModelFeature)), { ssr: false, loading: Loading });
function renderWidget({ people, featureStep }: DeferredState) { return <Feature people={people || []} initialStep={featureStep} />; }
export function DeferredFeatureWidget({ children, people }: { children: ReactNode; people: FeaturedRoleModel[] }) {
  return <DeferredWidgetBase kind="feature" people={people} render={renderWidget}>{children}</DeferredWidgetBase>;
}
