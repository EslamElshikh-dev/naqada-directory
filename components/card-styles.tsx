'use client';

import { useEffect } from 'react';
import { ensureWidgetStyles } from '@/lib/widget-styles';

export function CardStyles({ eager = false, cardId }: { eager?: boolean; cardId: string }) {
  useEffect(() => {
    if (eager) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        void ensureWidgetStyles('cards').catch(() => {});
        observer.disconnect();
      }
    }, { rootMargin: '400px' });
    const card = [...document.querySelectorAll<HTMLElement>('article.listing-card')].find(node => node.dataset.cardKey === cardId);
    if (card) observer.observe(card);
    return () => observer.disconnect();
  }, [eager, cardId]);
  return eager ? <link rel="stylesheet" href="/styles/widgets/cards.css" precedence="widgets" /> : null;
}
