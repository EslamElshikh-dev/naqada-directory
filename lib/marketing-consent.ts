'use client';
import { useSyncExternalStore } from 'react';
export type MarketingConsent = 'granted' | 'denied' | null;
const key = 'naqada-marketing-consent';
let memory: MarketingConsent = null;
function snapshot(): MarketingConsent {
  try { const value = localStorage.getItem(key); if (value === 'granted' || value === 'denied') return value; } catch {}
  return memory;
}
function subscribe(update: () => void) {
  const stored = () => { memory = null; update(); };
  window.addEventListener('storage', stored); window.addEventListener('naqada-consent', update);
  return () => { window.removeEventListener('storage', stored); window.removeEventListener('naqada-consent', update); };
}
export function setMarketingConsent(value: Exclude<MarketingConsent, null>) {
  memory = value;
  try { localStorage.setItem(key, value); } catch {}
  window.dispatchEvent(new Event('naqada-consent'));
}
export function useMarketingConsent() { return useSyncExternalStore(subscribe, snapshot, () => null); }
