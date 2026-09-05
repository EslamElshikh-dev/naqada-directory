'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ensureClientSession, subscribeClientSession, type ClientSessionUser } from './client-session';

function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.7 19.5c.8-3.4 3-5.2 6.3-5.2s5.5 1.8 6.3 5.2"/></svg>;
}

export function AccountButton() {
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');
  useEffect(() => {
    const unsubscribe = subscribeClientSession((value) => {
      if (value !== undefined) { setUser(value); setReady(true); }
    });
    void ensureClientSession().finally(() => setReady(true));
    return unsubscribe;
  }, []);
  const initial = user?.displayName.trim().charAt(0);
  const showAvatar = Boolean(user?.avatarUrl && failedAvatarUrl !== user.avatarUrl);
  return (
    <Link className={`account-trigger${user ? ' is-member' : ''}`} href={user ? '/account' : '/account/login'} aria-label={user ? `حساب ${user.displayName}` : 'تسجيل الدخول أو إنشاء حساب'}>
      <span className="account-trigger__icon" aria-hidden="true">
        {showAvatar ? <Image className="account-trigger__photo" src={user!.avatarUrl} alt="" fill sizes="32px" referrerPolicy="no-referrer" onError={() => setFailedAvatarUrl(user!.avatarUrl)} /> : initial ? <b>{initial}</b> : <UserIcon />}
      </span>
      <span>{ready && user ? user.displayName.split(' ')[0] : 'دخول'}</span>
    </Link>
  );
}
