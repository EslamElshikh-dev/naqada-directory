import type { ReactNode } from 'react';

type IconName = 'health' | 'shop' | 'education' | 'food' | 'worship' | 'build' | 'transport' | 'tech' | 'work' | 'government' | 'community' | 'emergency';

const categoryMarks: Record<string, IconName> = {
  'الطب والصحة': 'health',
  'التجزئة والتسوق': 'shop',
  'التعليم': 'education',
  'المطاعم والأطعمة': 'food',
  'دور العبادة': 'worship',
  'البناء والصيانة': 'build',
  'السيارات والنقل': 'transport',
  'الإلكترونيات والهواتف': 'tech',
  'الخدمات المهنية': 'work',
  'الخدمات الحكومية': 'government',
  'الجمعيات والمجتمع': 'community',
  emergency: 'emergency',
};

function CategoryIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    health: <><path d="M12 20s-7-4.1-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.9-7 10-7 10Z"/><path d="M9 12h6M12 9v6"/></>,
    shop: <><path d="M4 9h16l-1.2-5H5.2L4 9Z"/><path d="M6 9v10h12V9M9 19v-5h6v5"/><path d="M4 9c0 1.4 1 2.5 2.3 2.5S8.7 10.4 8.7 9c0 1.4 1 2.5 2.3 2.5s2.3-1.1 2.3-2.5c0 1.4 1 2.5 2.4 2.5S18 10.4 18 9"/></>,
    education: <><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 11.5V16c3.7 2.6 8.3 2.6 12 0v-4.5M21 9v6"/></>,
    food: <><path d="M7 3v8M4.5 3v4.5A3.5 3.5 0 0 0 8 11h1.5A3.5 3.5 0 0 0 13 7.5V3M9 11v10"/><path d="M18 3c-2.2 2-2.4 6.5-.5 9H20V3h-2ZM18 12v9"/></>,
    worship: <><path d="M4 20h16M6 20v-8h12v8M8 12V8h8v4M10 8c0-2 2-4 2-4s2 2 2 4M10 20v-4h4v4"/></>,
    build: <><path d="m14 5 5 5M12.5 6.5l5 5M4 20l8-8 3 3-8 8H4v-3Z"/><path d="m13 4 2-2 7 7-2 2"/></>,
    transport: <><path d="M5 17h14l-1-7H6l-1 7Z"/><path d="m7 10 1.5-4h7L17 10M4 14H2M22 14h-2"/><circle cx="8" cy="18" r="1.7"/><circle cx="16" cy="18" r="1.7"/></>,
    tech: <><rect x="6" y="2.8" width="12" height="18.4" rx="2.3"/><path d="M9 6h6M10 17.5h4"/></>,
    work: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></>,
    government: <><path d="m3 9 9-5 9 5H3ZM5 20h14M6 9v8M10 9v8M14 9v8M18 9v8"/></>,
    community: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20v-2a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v2M14 14a4.5 4.5 0 0 1 7.5 3.4V20"/></>,
    emergency: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.2v.2"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function CategoryVisual({ category, size = 'md' }: { category: string; size?: 'sm' | 'md' | 'lg' }) {
  const icon = categoryMarks[category] || 'work';
  return <span className={`category-visual category-visual--${size} category-visual--${icon}`} aria-hidden="true"><i /><CategoryIcon name={icon} /></span>;
}
