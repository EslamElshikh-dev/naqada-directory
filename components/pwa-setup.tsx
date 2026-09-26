'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let pendingInstallPrompt: InstallPromptEvent | null = null;
let wasInstalled = false;
const promptChanged = 'naqada:install-prompt-changed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaSetup() {
  useEffect(() => {
    function onInstallPrompt(event: Event) {
      event.preventDefault();
      pendingInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event(promptChanged));
    }

    function onInstalled() {
      pendingInstallPrompt = null;
      wasInstalled = true;
      window.dispatchEvent(new Event(promptChanged));
    }

    function registerWorker() {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
          // A failed registration must not block the live directory.
        });
      }
    }

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (document.readyState === 'complete') registerWorker();
    else window.addEventListener('load', registerWorker, { once: true });

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('load', registerWorker);
    };
  }, []);

  return null;
}

export function InstallAction() {
  const [platform, setPlatform] = useState<'manual' | 'ios' | 'prompt' | 'installed'>('manual');

  useEffect(() => {
    function update() {
      if (isStandalone() || wasInstalled) setPlatform('installed');
      else if (pendingInstallPrompt) setPlatform('prompt');
      else if (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) setPlatform('ios');
      else setPlatform('manual');
    }

    update();
    window.addEventListener(promptChanged, update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener(promptChanged, update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  async function install() {
    const prompt = pendingInstallPrompt;
    if (!prompt) return;
    pendingInstallPrompt = null;
    window.dispatchEvent(new Event(promptChanged));
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // The browser may dismiss the prompt; the manual steps remain available.
    }
  }

  if (platform === 'installed') return <Link href="/">افتح دليل نقادة <span aria-hidden="true">←</span></Link>;
  if (platform === 'prompt') return <button type="button" onClick={install}>ثبّت التطبيق الآن <span aria-hidden="true">←</span></button>;
  return <a href={platform === 'ios' ? '#iphone' : '#android'}>شوف طريقة التثبيت <span aria-hidden="true">↓</span></a>;
}

export function CopyInstallLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <button type="button" onClick={copy} aria-live="polite">{copied ? 'اتنسخ الرابط ✓' : 'انسخ الرابط'}</button>;
}
