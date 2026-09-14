'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { SanadReply } from '@/lib/sanad';
import styles from './sanad-assistant.module.css';

type Message = { role: 'user' | 'assistant'; text: string; reply?: SanadReply };
const prompts = ['أبحث عن خدمة', 'القرى والنجوع', 'معالم نقادة', 'إزاي أضيف نشاط؟'];
const welcome: Message = { role: 'assistant', text: 'يا مرحب بيك! أنا سند، مساعدك في دليل نقادة. قولّي بتدور على إيه وفي أي قرية، وأنا أسندك.' };
function Icon({ close = false }: { close?: boolean }) { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{close ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3" />}</svg>; }
export function SanadAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState('');
  const query = useRef('');
  const busy = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    field.current?.focus({ preventScroll: true });
    const viewport = window.visualViewport;
    const resize = () => {
      panel.current?.style.setProperty('--sanad-viewport', `${viewport?.height || window.innerHeight}px`);
      panel.current?.style.setProperty('--sanad-keyboard', `${Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0))}px`);
    };
    resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
    return () => { viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); };
  }, [open]);
  useEffect(() => {
    if (!open || !log.current) return;
    const last = log.current.lastElementChild;
    if (pending || !last) log.current.scrollTop = log.current.scrollHeight;
    else log.current.scrollTop += last.getBoundingClientRect().top - log.current.getBoundingClientRect().top - 12;
  }, [messages, pending, open]);
  function close() { setOpen(false); launcher.current?.focus(); }
  async function send(value: string, retry = false) {
    const text = value.trim();
    if (!text || busy.current) return;
    busy.current = true; setPending(true); setError(''); setFailed(''); setInput('');
    if (!retry) setMessages(current => [...current.slice(-29), { role: 'user', text }]);
    const controller = new AbortController(); abort.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/sanad/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, previousQuery: query.current }), signal: controller.signal });
      if (!response.ok) throw new Error('request_failed');
      const reply: SanadReply = await response.json();
      query.current = reply.query || '';
      setMessages(current => [...current, { role: 'assistant', text: reply.text, reply }]);
    } catch { if (!controller.signal.aborted || abort.current === controller) { setError('الاتصال اتقطع قبل ما أوصل للإجابة. جرّب تاني.'); setFailed(text); } }
    finally { clearTimeout(timer); busy.current = false; setPending(false); }
  }
  const suggestions = messages.at(-1)?.reply?.suggestions || prompts;
  return <div className={styles.root} dir="rtl">
    <button ref={launcher} className={styles.launcher} aria-label="افتح محادثة سند، مساعد دليل نقادة" aria-expanded={open} aria-controls="sanad-panel" onClick={() => open ? close() : setOpen(true)}>
      <span className={styles.avatar}><Image src="/images/assistant/sanad.webp" alt="سند، شاب بزي صعيدي" width={68} height={68} sizes="68px" /></span>
      <span className={styles.launcherLabel}>سند <span>اسأل ابن البلد</span></span>
    </button>
    {open && <section id="sanad-panel" ref={panel} className={styles.panel} role="dialog" aria-label="محادثة سند" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
      <header className={styles.header}>
        <Image src="/images/assistant/sanad.webp" alt="" width={48} height={48} sizes="48px" />
        <div><h2>سند</h2><p>مساعدك في دليل نقادة</p></div>
        <button onClick={close} className={styles.close} aria-label="إغلاق محادثة سند"><Icon close /></button>
      </header>
      <div className={styles.tools}><span>إجابات من محتوى الدليل</span><button disabled={pending} onClick={() => { setMessages([welcome]); query.current = ''; setError(''); setFailed(''); field.current?.focus(); }}>محادثة جديدة</button></div>
      <div ref={log} className={styles.log} role="log" aria-live="polite" aria-relevant="additions" aria-label="رسائل المحادثة" aria-busy={pending}>
        {messages.map((message, index) => <div key={index} className={message.role === 'user' ? styles.user : styles.answer}>
          <span className={styles.speaker}>{message.role === 'user' ? 'أنت' : 'سند'}</span><p>{message.text}</p>
          {message.reply?.cards.map(card => <article key={card.href + card.title} className={styles.card}>
            <Link href={card.href} onClick={close}><small>{card.badge}</small><strong>{card.title}</strong>{card.subtitle && <span>{card.subtitle}</span>}</Link>
            {card.detail && <p>{card.detail}</p>}
            {(card.phone || card.mapsUrl) && <div className={styles.actions}>{card.phone && <a href={`tel:${card.phone.replace(/[^+\d]/g, '')}`}>اتصال <bdi>{card.phone}</bdi></a>}{card.mapsUrl && <a href={card.mapsUrl} target="_blank" rel="noreferrer">الخريطة ↗</a>}</div>}
          </article>)}
        </div>)}
        {pending && <p className={styles.loading} role="status">سند بيدوّر لك في الدليل<span>…</span></p>}
      </div>
      {error && <div className={styles.error} role="alert">{error}<button onClick={() => send(failed, true)}>إعادة المحاولة</button></div>}
      <div className={styles.suggestions} aria-label="أسئلة مقترحة">{suggestions.map(text => <button key={text} disabled={pending} onClick={() => send(text)}>{text}</button>)}</div>
      <form className={styles.form} onSubmit={event => { event.preventDefault(); send(input); }}>
        <label className={styles.srOnly} htmlFor="sanad-question">سؤالك لسند</label>
        <input id="sanad-question" ref={field} value={input} maxLength={600} autoComplete="off" onChange={event => setInput(event.target.value)} placeholder="اكتب سؤالك… أنا معاك" />
        <button type="submit" disabled={pending || !input.trim()} aria-label="إرسال السؤال"><Icon /></button>
      </form>
      <p className={styles.note}>راجع التفاصيل مع النشاط قبل الزيارة.</p>
    </section>}
  </div>;
}
