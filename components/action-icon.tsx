import type { ReactNode } from 'react';

export type ActionIconName = 'add' | 'arrow' | 'call' | 'map' | 'star' | 'landmark' | 'login';

export function ActionIcon({ name, className = '' }: { name: ActionIconName; className?: string }) {
  const paths: Record<ActionIconName, ReactNode> = {
    add: <><path d="M12 5v14M5 12h14"/><path d="M5.5 3.5h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" opacity=".35"/></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    call: <path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-4-1-1.2 2.1a15.3 15.3 0 0 1-9.9-9.9L8 7 7 3Z"/>,
    map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></>,
    star: <path d="m12 3 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 16.53l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3Z"/>,
    landmark: <><path d="m3 9 9-5 9 5H3Z"/><path d="M5 20h14M6.5 9v8M10.2 9v8M13.8 9v8M17.5 9v8"/></>,
    login: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M11 16l4-4-4-4M15 12H4"/></>,
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
