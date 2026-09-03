export type AnalyticsData = Record<string, string | number | boolean>;

type AnalyticsWindow = Window & {
  va?: (command: 'event', payload: { name: string; data?: AnalyticsData }) => void;
};

export function trackEvent(name: string, data?: AnalyticsData) {
  if (typeof window === 'undefined') return;
  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.va?.('event', { name, data });
}

export function privacySafeSearchTerm(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/\S+@\S+\.\S+/.test(trimmed)) return '';
  if (/(?:\+?\d[\d\s().-]{6,}\d)/.test(trimmed)) return '';
  return trimmed.replace(/\s+/g, ' ').slice(0, 70);
}
