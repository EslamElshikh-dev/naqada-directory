'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { evaluatePassword, PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy';
import { setClientSessionUser, type ClientSessionUser } from './client-session';

type Result = { error?: string; verificationSent?: boolean; user?: ClientSessionUser };

async function send(path: string, payload: Record<string, string>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as Result;
  if (!response.ok) throw new Error(data.error || 'تعذر إتمام العملية.');
  return data;
}

function Eye({ open }: { open: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{open ? <><path d="M3 3l18 18"/><path d="M10.7 10.8a2 2 0 0 0 2.6 2.5"/><path d="M9.6 4.3A10 10 0 0 1 22 12a13 13 0 0 1-2.4 4.2M6.4 6.4A13 13 0 0 0 2 12c1.4 4 5 7 10 7 1.4 0 2.7-.3 3.9-.8"/></> : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></>}</svg>;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3v2.7A10.1 10.1 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3a10.1 10.1 0 0 0 0 9.3L6.4 14Z"/>
      <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 4 1.6l3-3A10 10 0 0 0 3 7.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"/>
    </svg>
  );
}

function SocialAuth() {
  return (
    <div className="social-auth">
      <a className="auth-google" href="/api/auth/google"><GoogleIcon/><span>المتابعة باستخدام Google</span><b aria-hidden="true">←</b></a>
      <div className="auth-divider"><span>أو أكمل بالبريد الإلكتروني</span></div>
    </div>
  );
}

function PasswordField({ id, name, value, onChange, autoComplete }: { id: string; name: string; value?: string; onChange?: (value: string) => void; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password">
      <input id={id} name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} autoComplete={autoComplete} minLength={PASSWORD_MIN_LENGTH} required placeholder="••••••••••" />
      <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}><Eye open={visible}/></button>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await send('/api/auth/login', { email: String(form.get('email') || ''), password: String(form.get('password') || '') });
      if (result.user) setClientSessionUser(result.user);
      router.replace('/account');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر تسجيل الدخول.');
    } finally { setBusy(false); }
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <SocialAuth />
      <label htmlFor="login-email">البريد الإلكتروني</label>
      <input id="login-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@example.com" dir="ltr"/>
      <label htmlFor="login-password">كلمة المرور</label>
      <PasswordField id="login-password" name="password" autoComplete="current-password"/>
      <div className="auth-feedback" aria-live="polite">{error && <span>{error}</span>}</div>
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}</button>
      <p className="auth-switch">ليس لديك حساب؟ <Link href="/account/register">أنشئ حسابًا جديدًا</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const strength = evaluatePassword(password);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين.'); return; }
    if (!strength.valid) { setError(strength.message); return; }
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await send('/api/auth/register', { name: String(form.get('name') || ''), email: String(form.get('email') || ''), password });
      if (result.verificationSent) { setVerificationSent(true); return; }
      if (result.user) setClientSessionUser(result.user);
      router.replace('/account');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر إنشاء الحساب.');
    } finally { setBusy(false); }
  }
  if (verificationSent) return (
    <div className="auth-success"><span>✓</span><h2>تم إنشاء حسابك</h2><p>أرسلنا رابط تأكيد إلى بريدك. افتح الرسالة وأكد الحساب، ثم سجّل الدخول.</p><Link href="/account/login">الذهاب إلى تسجيل الدخول</Link></div>
  );
  return (
    <form className="auth-form" onSubmit={submit}>
      <SocialAuth />
      <label htmlFor="register-name">الاسم الكامل</label>
      <input id="register-name" name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required placeholder="اسمك كما تحب أن يظهر"/>
      <label htmlFor="register-email">البريد الإلكتروني</label>
      <input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@example.com" dir="ltr"/>
      <label htmlFor="register-password">كلمة المرور</label>
      <PasswordField id="register-password" name="password" autoComplete="new-password" value={password} onChange={setPassword}/>
      <div className="password-meter" aria-live="polite"><span style={{ width: `${strength.score * 25}%` }}/><b>{password ? strength.label : `ابدأ بـ ${PASSWORD_MIN_LENGTH} أحرف مع حرف ورقم`}</b></div>
      <label htmlFor="register-confirm">تأكيد كلمة المرور</label>
      <PasswordField id="register-confirm" name="confirm" autoComplete="new-password" value={confirm} onChange={setConfirm}/>
      <div className="auth-feedback" aria-live="polite">{error && <span>{error}</span>}</div>
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جارٍ إنشاء الحساب…' : 'إنشاء حساب عضو'}</button>
      <p className="auth-switch">لديك حساب بالفعل؟ <Link href="/account/login">تسجيل الدخول</Link></p>
    </form>
  );
}
