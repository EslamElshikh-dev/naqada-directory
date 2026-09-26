'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AdminLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const interval = window.setInterval(refresh, 90_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [router]);

  return <button type="button" onClick={() => router.refresh()} aria-label="تحديث بيانات لوحة الإدارة الآن">↻ تحديث الآن</button>;
}
