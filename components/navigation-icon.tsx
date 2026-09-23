import type { ReactNode } from 'react';

export type NavigationIconName = 'home' | 'services' | 'villages' | 'news' | 'knowledge' | 'stories';

const paths: Record<NavigationIconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></>,
  services: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 17.5h7M17.5 14v7"/></>,
  villages: <><path d="M18 9c0 5-6 11-6 11S6 14 6 9a6 6 0 0 1 12 0Z"/><circle cx="12" cy="9" r="2"/></>,
  news: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h3M8 18h3"/><path d="M15 15h1v3h-1Z"/></>,
  knowledge: <><path d="M12 5v16M12 5C9 3 6 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-3-1-6-1-9 1Z"/></>,
  stories: <><path d="M20 11a8 8 0 0 1-8 8H5l-3 2V11a9 9 0 0 1 18 0Z"/><path d="M6 10h10M6 14h6"/></>,
};

export function NavigationIcon({ name }: { name: NavigationIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
