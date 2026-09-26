'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { ensureClientSession, subscribeClientSession, type ClientSessionUser } from './client-session';
import { MemberAvatar } from './member-avatar';
import type { MemberReputation } from '@/lib/member-reputation';

function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.7 19.5c.8-3.4 3-5.2 6.3-5.2s5.5 1.8 6.3 5.2"/></svg>;
}

type ProfileState = {
  userId: string;
  name: string;
  avatarUrl: string;
  reputation: MemberReputation | null;
};

export function AccountButton() {
  const router = useRouter();
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [ready, setReady] = useState(false);
  const userId = user?.id ?? null;
  const profile = profileState?.userId === userId ? profileState : null;
  const displayName = profile?.name || user?.displayName || '';
  const avatarUrl = profile?.avatarUrl || user?.avatarUrl || '';

  const loadSession = useCallback(() => ensureClientSession().finally(() => setReady(true)), []);

  useEffect(() => {
    const unsubscribe = subscribeClientSession((value) => {
      if (value !== undefined) { setUser(value); setReady(true); }
    });

    void loadSession();
    return unsubscribe;
  }, [loadSession]);

  useEffect(() => {
    if (!userId) return;

    let active = true;
    void fetch('/api/profile', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active) return;
        setProfileState({ userId, name: data?.profile?.fullName || '', avatarUrl: data?.profile?.avatarUrl || '', reputation: data?.profile?.reputation || null });
      })
      .catch(() => null);

    return () => { active = false; };
  }, [userId]);

  const handleClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (ready) return;
    event.preventDefault();
    void loadSession().then((currentUser) => {
      router.push(currentUser ? '/account' : '/account/login');
    });
  }, [loadSession, ready, router]);

  return (
    <Link
      className={`account-trigger${user ? ' is-member' : ''}`}
      href={user ? '/account' : '/account/login'}
      aria-label={user ? `حساب ${displayName}` : 'تسجيل الدخول أو إنشاء حساب'}
      onPointerEnter={loadSession}
      onFocus={loadSession}
      onClick={handleClick}
    >
      <span className="account-trigger__icon" aria-hidden="true">
        {user ? (
          <MemberAvatar name={displayName} src={avatarUrl} frame={profile?.reputation?.frameCode || 'gray'} size={38} compact header priority />
        ) : <UserIcon />}
      </span>
      <span>{ready && user ? displayName.split(' ')[0] : 'دخول'}</span>
    </Link>
  );
}
