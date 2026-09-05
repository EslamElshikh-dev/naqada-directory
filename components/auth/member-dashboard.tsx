'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { localities } from '@/lib/data';
import { ensureClientSession, setClientSessionUser, updateClientSessionUser, type ClientSessionUser } from './client-session';

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  locality: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string | null;
};

export function MemberDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void ensureClientSession().then(async (sessionUser) => {
      if (!active) return;
      if (!sessionUser) { router.replace('/account/login'); return; }
      setUser(sessionUser);
      const [profileResponse, adminResponse] = await Promise.all([
        fetch('/api/profile', { cache: 'no-store' }),
        fetch('/api/admin/access', { cache: 'no-store' }),
      ]);
      if (profileResponse.ok) {
        const data = await profileResponse.json() as { profile: Profile };
        if (active) setProfile(data.profile);
      }
      if (adminResponse.ok && active) setIsAdmin(true);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  const completion = useMemo(() => {
    if (!profile) return 0;
    return Math.round(([profile.fullName, profile.phone, profile.locality, profile.bio].filter(Boolean).length / 4) * 100);
  }, [profile]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await response.json() as { error?: string; profile?: Profile };
      if (!response.ok || !data.profile) throw new Error(data.error || 'تعذر الحفظ.');
      setProfile(data.profile);
      setUser((current) => current ? { ...current, displayName: data.profile!.fullName } : current);
      updateClientSessionUser({ displayName: data.profile.fullName });
      setFeedback('تم حفظ بيانات ملفك الشخصي.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر حفظ البيانات.');
    } finally { setSaving(false); }
  }

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
    setClientSessionUser(null);
    router.replace('/');
    router.refresh();
  }

  if (loading || !user || !profile) return <div className="member-loading"><span/><p>جارٍ تجهيز مساحة العضو…</p></div>;
  const initial = profile.fullName.trim().charAt(0) || 'ع';
  const avatarUrl = profile.avatarUrl || user.avatarUrl;
  return (
    <div className="member-dashboard">
      <section className="member-overview">
        <div className="member-avatar" aria-hidden="true">{avatarUrl && !avatarFailed ? <Image src={avatarUrl} alt="" fill sizes="72px" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} /> : initial}</div>
        <div className="member-welcome"><span>مرحبًا بك في دليل نقادة</span><h2>{profile.fullName}</h2>{profile.bio ? <p className="member-welcome__bio">{profile.bio}</p> : <p className="member-welcome__bio is-empty">أضف نبذة عنك لتظهر أسفل اسمك في مشاركاتك.</p>}<small dir="ltr">{profile.email}</small></div>
        <div className="member-status"><span>{user.emailVerified ? 'حساب مؤكد' : 'بانتظار تأكيد البريد'}</span><strong>{completion}%</strong><small>اكتمال الملف</small></div>
      </section>

      {isAdmin && <Link href="/admin" className="admin-entry"><span>لوحة الإدارة المعتمدة</span><strong>افتح مركز تشغيل دليل نقادة</strong><b>الإحصاءات والمراجعات والبيانات ←</b></Link>}

      <div className="member-grid">
        <section className="profile-editor" id="profile">
          <header><div><span>هويتك داخل الدليل</span><h2>الملف الشخصي</h2><p>واجهة أوضح وأجمل لإدارة بياناتك العامة.</p></div><div className="profile-completion"><i style={{ '--profile-completion': `${completion}%` } as React.CSSProperties}/><b>{completion}%</b></div></header>
          <form onSubmit={save}>
            <div className="profile-field profile-field--wide"><label htmlFor="profile-name">الاسم الكامل</label><input id="profile-name" value={profile.fullName} onChange={(event) => update('fullName', event.target.value)} minLength={2} maxLength={80} required/></div>
            <div className="profile-field"><label htmlFor="profile-email">البريد الإلكتروني</label><input id="profile-email" value={profile.email} readOnly disabled dir="ltr"/></div>
            <div className="profile-field"><label htmlFor="profile-phone">رقم الهاتف <span>اختياري</span></label><input id="profile-phone" value={profile.phone} onChange={(event) => update('phone', event.target.value)} inputMode="tel" dir="ltr" placeholder="01000000000"/></div>
            <div className="profile-field profile-field--wide"><label htmlFor="profile-locality">القرية أو الموضع <span>اختياري</span></label><select id="profile-locality" value={profile.locality} onChange={(event) => update('locality', event.target.value)}><option value="">اختر من نطاق دليل نقادة</option>{localities.map((item) => <option value={item.name} key={`${item.name}-${item.type}`}>{item.name} — {item.type}</option>)}</select></div>
            <div className="profile-field profile-field--wide"><label htmlFor="profile-bio">نبذة عنك <span>اختياري · تظهر في مشاركاتك</span></label><textarea id="profile-bio" value={profile.bio} onChange={(event) => update('bio', event.target.value.slice(0, 280))} maxLength={280} placeholder="عرّف أعضاء الدليل بنفسك أو اكتب علاقتك بنقادة…"/><small>{profile.bio.length}/280</small></div>
            <div className="profile-actions"><div aria-live="polite">{error ? <span className="is-error">{error}</span> : feedback ? <span className="is-success">{feedback}</span> : <span>يظهر اسمك ونبذتك فقط بجانب مشاركاتك العامة.</span>}</div><button type="submit" disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button></div>
          </form>
        </section>

        <aside className="member-side">
          <section><span>اختصارات العضو</span><h2>كل ما تحتاجه قريب</h2><div className="member-links"><Link href="/directory"><b>01</b><span>استكشف الأنشطة<small>ابحث واتصل وافتح الخرائط</small></span><i>←</i></Link><Link href="/contribute"><b>02</b><span>أضف أو صحح نشاطًا<small>ساهم في تحديث الدليل</small></span><i>←</i></Link><Link href="/#site-reviews"><b>03</b><span>قيّم دليل نقادة<small>شارك رأيك مع المجتمع</small></span><i>←</i></Link></div></section>
          <section className="member-security"><span>حماية الحساب</span><strong>{user.emailVerified ? 'البريد مؤكد والحساب نشط' : 'أكمل تأكيد البريد'}</strong><p>جلسة الدخول محفوظة في ملفات ارتباط آمنة ولا تُعرض مفاتيح الإدارة داخل المتصفح.</p></section>
        </aside>
      </div>
      <div className="member-footer"><span>عضو منذ {profile.createdAt ? new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt)) : 'اليوم'}</span><button type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'جارٍ الخروج…' : 'تسجيل الخروج'}</button></div>
    </div>
  );
}
