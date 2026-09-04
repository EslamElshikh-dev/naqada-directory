'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/site-shell';
import { setClientSessionUser, type ClientSessionUser } from '@/components/auth/client-session';

type CallbackState = 'working' | 'error';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>('working');
  const [message, setMessage] = useState('جارٍ تأمين حسابك وإعداد لوحة العضو…');

  useEffect(() => {
    let active = true;

    async function complete() {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = params.get('access_token') || '';
      const refreshToken = params.get('refresh_token') || '';
      const expiresIn = params.get('expires_in') || '3600';
      const providerError = params.get('error_description') || params.get('error');
      window.history.replaceState({}, document.title, window.location.pathname);

      if (providerError || !accessToken || !refreshToken) {
        if (!active) return;
        setState('error');
        setMessage(providerError ? 'تعذر إتمام الدخول عبر Google. حاول مرة أخرى.' : 'لم تصل بيانات الدخول بصورة صحيحة.');
        return;
      }

      try {
        const response = await fetch('/api/auth/oauth-complete', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, expiresIn }),
        });
        const data = await response.json().catch(() => ({})) as { user?: ClientSessionUser; error?: string };
        if (!response.ok || !data.user) throw new Error(data.error || 'تعذر حفظ جلسة الدخول.');
        setClientSessionUser(data.user);
        router.replace('/account');
        router.refresh();
      } catch (error) {
        if (!active) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'تعذر إتمام تسجيل الدخول.');
      }
    }

    complete();
    return () => { active = false; };
  }, [router]);

  return (
    <main id="main-content" className="oauth-callback-page">
      <section className="oauth-callback-card" aria-live="polite">
        <BrandMark />
        {state === 'working' ? <span className="oauth-spinner" aria-hidden="true" /> : <span className="oauth-error-mark" aria-hidden="true">!</span>}
        <h1>{state === 'working' ? 'لحظات ونفتح حسابك' : 'لم تكتمل العملية'}</h1>
        <p>{message}</p>
        {state === 'error' && <Link href="/account/login">العودة إلى تسجيل الدخول</Link>}
      </section>
    </main>
  );
}
