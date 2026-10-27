'use client';

type Widget = 'sanad' | 'notifications' | 'search' | 'reviews' | 'cards';
const pending = new Map<Widget, Promise<void>>();

export function ensureWidgetStyles(name: Widget): Promise<void> {
  const existing = pending.get(name);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/styles/widgets/${name}.css`;
    link.dataset.widgetStyles = name;
    link.onload = () => resolve();
    link.onerror = () => { link.remove(); pending.delete(name); reject(Error('WIDGET_STYLES_UNAVAILABLE')); };
    document.head.append(link);
  });
  pending.set(name, promise);
  return promise;
}
