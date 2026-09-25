'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { JobFeedState, LocalJob } from '@/lib/jobs';
import styles from './jobs.module.css';

type Mode = 'offer' | 'seeker';
type Contact = LocalJob['contact_kind'];

const workTypes: Record<NonNullable<LocalJob['work_type']>, string> = {
  'full-time': 'دوام كامل', 'part-time': 'دوام جزئي', temporary: 'مؤقت', flexible: 'مرن',
};

function dateLabel(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' }).format(time) : '';
}

function contactHref(job: LocalJob) {
  if (job.contact_kind === 'email') return `mailto:${job.contact_value}`;
  if (job.contact_kind === 'phone') return `tel:${job.contact_value.replace(/[^+\d]/g, '')}`;
  if (job.contact_kind === 'whatsapp') return `https://wa.me/${job.contact_value.replace(/\D/g, '')}`;
  try { const url = new URL(job.contact_value); return url.protocol === 'https:' ? url.href : '#participate'; }
  catch { return '#participate'; }
}

function JobCard({ job }: { job: LocalJob }) {
  const isExternal = job.origin === 'external';
  return <article className={`${styles.jobCard} ${job.kind === 'seeker' ? styles.seekerCard : ''}`} id={`job-${job.id}`}>
    <div className={styles.cardTop}><span className={styles.cardSymbol} aria-hidden="true">{job.kind === 'seeker' ? '✦' : '↗'}</span><span className={styles.cardPill}>{job.kind === 'offer' ? (isExternal ? job.source_name?.includes('فيسبوك') ? 'من فيسبوك العام' : 'من مصدر خارجي' : 'فرصة من أهل البلد') : 'باحث عن شغل'}</span><time dateTime={job.published_at}>{isExternal ? 'رُصد ' : ''}{dateLabel(job.published_at)}</time></div>
    <h3>{job.title}</h3>
    <p className={styles.organization}>{job.organization || (job.kind === 'seeker' ? 'شخص من أهل نقادة' : job.source_name || 'إعلان محلي')}</p>
    <div className={styles.tags}><span>⌖ {job.locality}</span><span>{job.field}</span>{job.work_type ? <span>{workTypes[job.work_type]}</span> : null}</div>
    <p className={styles.description}>{job.description}</p>
    {job.experience ? <p className={styles.experience}><strong>الخبرة:</strong> {job.experience}</p> : null}
    <div className={styles.cardBottom}>
      <a href={contactHref(job)} target={job.contact_kind === 'link' || job.contact_kind === 'whatsapp' ? '_blank' : undefined} rel={job.contact_kind === 'link' || job.contact_kind === 'whatsapp' ? 'noopener noreferrer external' : undefined}>{isExternal ? 'شوف الإعلان وطريقة التقديم' : job.kind === 'seeker' ? 'تواصل مع صاحب الخبرة' : 'تواصل مع صاحب الوظيفة'} <span aria-hidden="true">↗</span></a>
      <small>{isExternal ? <>المصدر: {job.source_name || 'موقع خارجي'} · تأكد إن التقديم لسه مفتوح</> : 'بيانات التواصل نشرها صاحب الإعلان بموافقته'}</small>
    </div>
  </article>;
}

function PublishForm({ mode, localities }: { mode: Mode; localities: string[] }) {
  const [contactKind, setContactKind] = useState<Contact>('whatsapp');
  const [consent, setConsent] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setState('sending');
    setError('');
    try {
      const response = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        kind: mode, title: fields.get('title'), organization: fields.get('organization'), locality: fields.get('locality'),
        field: fields.get('field'), description: fields.get('description'), experience: fields.get('experience'), workType: fields.get('workType'),
        contactKind, contactValue: fields.get('contactValue'), contactConsent: consent, formStartedAt: startedAt, website: fields.get('website'),
      }) });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(response.status === 429 ? 'وصلنا منك طلبات كتير في وقت قصير. جرب بعد شوية.' : 'تعذر إرسال البيانات. راجع الخانات وجرب تاني.');
        setState('error');
        return;
      }
      setState('sent');
      form.reset();
      setStartedAt(Date.now());
      setConsent(false);
    } catch { setState('error'); setError('الاتصال قطع قبل ما الطلب يوصل. جرب تاني.'); }
  }

  return <div className={styles.formPanel}>
    <div className={styles.formIntro}><span>بيانات واضحة، وفرصة أقرب</span><h3>{mode === 'offer' ? 'قول لنا عن الفرصة من أولها.' : 'عرّف الناس عليك وعلى شغلك.'}</h3><p>{mode === 'offer' ? 'اكتب المطلوب وطريقة التقديم، وهنراجع إعلانك قبل ما يظهر للناس.' : 'اكتب مجال شغلك وخبرتك. ملفك هيظهر بعد المراجعة، ورقمك أو بريدك هيظهر فقط لو وافقت بنفسك.'}</p></div>
    {state === 'sent' ? <div className={styles.success} role="status"><strong>طلبك وصلنا يا غالي ✓</strong><p>هنراجع التفاصيل قبل النشر. لما تتنشر هتظهر هنا وفي شريط أخبار الموقع.</p><button type="button" onClick={() => { setState('idle'); setStartedAt(Date.now()); }}>قدّم طلب تاني</button></div> : <form onSubmit={submit} className={styles.form}>
      <div className={styles.twoFields}>
        <label>{mode === 'offer' ? 'اسم الوظيفة' : 'اسمك والمهنة اللي بتدور فيها'}<input name="title" required minLength={3} maxLength={140} placeholder={mode === 'offer' ? 'مثال: مطلوب محاسب في نقادة' : 'مثال: أحمد محمد · فني كهرباء'} /></label>
        <label>{mode === 'offer' ? 'اسم النشاط أو الشركة' : 'جهة عمل سابقة (اختياري)'}<input name="organization" required={mode === 'offer'} minLength={mode === 'offer' ? 2 : undefined} maxLength={120} placeholder={mode === 'offer' ? 'اسم المكان صاحب الإعلان' : 'لو تحب تذكرها'} /></label>
      </div>
      <div className={styles.twoFields}>
        <label>القرية أو المنطقة<select name="locality" required defaultValue=""><option value="" disabled>اختار مكانك من نقادة وقراها</option>{localities.map((place) => <option key={place} value={place}>{place}</option>)}</select></label>
        <label>مجال الشغل<input name="field" required minLength={2} maxLength={100} placeholder="مثال: تعليم، مبيعات، حرف، زراعة" /></label>
      </div>
      <label>{mode === 'offer' ? 'تفاصيل الشغل والشروط' : 'خبراتك ومهاراتك والشغل اللي بتدور عليه'}<textarea name="description" required minLength={20} maxLength={2000} rows={5} placeholder={mode === 'offer' ? 'احكي طبيعة الشغل والشروط ومكانه وطريقة التقديم...' : 'اشتغلت في إيه؟ وبتعرف تعمل إيه؟ وبتدور على فرصة في أنهي مجال؟'} /></label>
      <div className={styles.twoFields}>
        <label>{mode === 'offer' ? 'الخبرة المطلوبة (اختياري)' : 'سنين الخبرة أو أعمال سابقة (اختياري)'}<input name="experience" maxLength={600} placeholder="مثال: سنة خبرة أو متاح لحديثي التخرج" /></label>
        <label>نظام الشغل<select name="workType" defaultValue=""><option value="">غير محدد</option><option value="full-time">دوام كامل</option><option value="part-time">دوام جزئي</option><option value="temporary">مؤقت</option><option value="flexible">مرن</option></select></label>
      </div>
      <div className={styles.twoFields}>
        <label>طريقة التواصل<select value={contactKind} onChange={(event) => setContactKind(event.target.value as Contact)}><option value="whatsapp">واتساب</option><option value="phone">اتصال هاتفي</option><option value="email">بريد إلكتروني</option><option value="link">رابط إعلان أو تقديم</option></select></label>
        <label>بيانات التواصل<input name="contactValue" required maxLength={1000} type={contactKind === 'email' ? 'email' : contactKind === 'link' ? 'url' : 'tel'} placeholder={contactKind === 'email' ? 'name@example.com' : contactKind === 'link' ? 'https://...' : '01xxxxxxxxx'} /></label>
      </div>
      <label className={styles.consent}><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>أوافق على ظهور بيانات التواصل دي للزوار بعد مراجعة الإعلان. {mode === 'seeker' ? 'ملفي وخبراتي هيكونوا ظاهرين للعامة لمدة تصل إلى ٣٠ يومًا.' : 'الإعلان هيكون ظاهرًا للعامة لمدة تصل إلى ٣٠ يومًا.'}</span></label>
      <label className={styles.honeypot} aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {state === 'error' ? <p className={styles.error} role="alert">{error}</p> : null}
      <button type="submit" className={styles.submit} disabled={state === 'sending'}>{state === 'sending' ? 'بنرسل طلبك…' : mode === 'offer' ? 'ابعت الوظيفة للمراجعة ←' : 'ابعت خبرتك للمراجعة ←'}</button>
      <small className={styles.formNote}>المحتوى بيتراجع قبل النشر، وماتدفعش رسوم تقديم لحد من غير ما تتأكد من الجهة.</small>
    </form>}
  </div>;
}

export function JobsBoard({ jobs, offers, seekers, state, available, localities }: { jobs: LocalJob[]; offers: number; seekers: number; state: JobFeedState | null; available: boolean; localities: string[] }) {
  const [view, setView] = useState<Mode>('offer');
  const [publishMode, setPublishMode] = useState<Mode>('offer');
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState('');
  useEffect(() => {
    let scrollFrame: number;
    const syncHash = () => {
      const target = jobs.find((job) => window.location.hash === `#job-${job.id}`);
      if (!target) return;
      setView(target.kind);
      setQuery('');
      setPlace('');
      scrollFrame = requestAnimationFrame(() => document.getElementById(`job-${target.id}`)?.scrollIntoView({ block: 'center' }));
    };
    const frame = requestAnimationFrame(syncHash);
    window.addEventListener('hashchange', syncHash);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame); window.removeEventListener('hashchange', syncHash); };
  }, [jobs]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ar');
    return jobs.filter((job) => job.kind === view && (!place || job.locality === place) && (!normalized || `${job.title} ${job.organization || ''} ${job.field} ${job.description} ${job.locality}`.toLocaleLowerCase('ar').includes(normalized)));
  }, [jobs, view, query, place]);

  return <>
    <section id="opportunities" className={`shell ${styles.board}`}>
      <header className={styles.sectionHead}><div><span>من نقادة لكل قرية فيها</span><h2>فرص وخبرات من عندنا.</h2><p>الإعلان يوصلك بصاحبه، ومع كل فرصة خارجية هتلاقي رابط المصدر عشان تراجع تفاصيلها.</p></div><aside><strong>{offers.toLocaleString('ar-EG')}</strong><small>فرصة شغل</small><i /><strong>{seekers.toLocaleString('ar-EG')}</strong><small>باحث عن عمل</small></aside></header>
      <div className={styles.boardFrame}>
        <div className={styles.boardTabs} role="tablist" aria-label="نوع الإعلانات"><button type="button" role="tab" aria-selected={view === 'offer'} onClick={() => setView('offer')}>فرص الشغل <span>{offers.toLocaleString('ar-EG')}</span></button><button type="button" role="tab" aria-selected={view === 'seeker'} onClick={() => setView('seeker')}>ناس بتدور على شغل <span>{seekers.toLocaleString('ar-EG')}</span></button></div>
        <div className={styles.filters}><label><span>دور بالاسم أو المجال</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: مدرس، محاسب، كهربائي…" /></label><label><span>في أي قرية؟</span><select value={place} onChange={(event) => setPlace(event.target.value)}><option value="">كل نقادة وقراها</option>{localities.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></div>
        <div className={styles.resultLine}><span>ظاهر دلوقت <b>{filtered.length.toLocaleString('ar-EG')}</b> {view === 'offer' ? 'فرصة' : 'ملف خبرة'}</span><span>{state?.last_checked_at ? `آخر فحص للمصادر: ${dateLabel(state.last_checked_at)}` : 'بنجهّز رصد المصادر العامة'}</span></div>
        {!available ? <p className={styles.unavailable} role="status">الإعلانات مش متاحة للعرض دلوقت. جرب تفتح الصفحة بعد شوية.</p> : null}
        {filtered.length ? <div className={styles.cardGrid}>{filtered.map((job) => <JobCard key={job.id} job={job} />)}</div> : available ? <div className={styles.empty}><span aria-hidden="true">✳</span><h3>{query || place ? 'ملقيناش إعلان يطابق بحثك دلوقت.' : view === 'offer' ? 'أول فرصة في بلدنا لسه جاية.' : 'لسه محدش عرض خبرته أهنه.'}</h3><p>{query || place ? 'جرب مجال تاني أو اختار كل القرى.' : 'القسم بيتحدث من المصادر العامة، وإعلانات أهل البلد بتظهر بعد المراجعة. لو تعرف فرصة، افتح لها الباب.'}</p><a href="#participate">{view === 'offer' ? 'انشر وظيفة من عندك' : 'اعرض خبرتك'} ←</a></div> : null}
      </div>
      <p className={styles.sourceNote}>نفتش كل ٣٠ دقيقة في الأخبار ومنشورات الصفحات والجروبات العامة المفهرسة، ونختار الروابط الفردية ذات التاريخ القريب. تاريخ الرصد ما يضمنش إن التقديم لسه مفتوح؛ راجع المنشور الأصلي قبل ما تتواصل. وتقدر كمان <a href="https://www.facebook.com/search/posts/?q=%D9%85%D8%B7%D9%84%D9%88%D8%A8%20%D9%86%D9%82%D8%A7%D8%AF%D8%A9" target="_blank" rel="noopener noreferrer external">تفتش بنفسك في منشورات نقادة على فيسبوك ↗</a>.</p>
    </section>
    <section id="participate" className={styles.participate}><div className={`shell ${styles.participateGrid}`}><div className={styles.participateCopy}><span>شارك في فتح باب رزق</span><h2>عندك شغل؟<br /><em>أو بتدور على شغل؟</em></h2><p>الفرصة ممكن تبدأ بكلمتين واضحين. اكتب بياناتك، وسيب لأهل بلدك طريقة يوصلوا لك بعد المراجعة.</p><div className={styles.step}><b>١</b><div><strong>اكتب المعلومات المهمة</strong><small>المجال، المكان، والخبرة أو شروط الشغل.</small></div></div><div className={styles.step}><b>٢</b><div><strong>بنراجع الإعلان</strong><small>عشان اللي ظاهر للناس يكون واضحًا ومحليًا.</small></div></div><div className={styles.step}><b>٣</b><div><strong>الناس تقدر توصلك</strong><small>من البطاقة في الصفحة ومن شريط أخبار الموقع.</small></div></div></div><div className={styles.publishBox}><div className={styles.publishTabs}><button type="button" aria-pressed={publishMode === 'offer'} onClick={() => setPublishMode('offer')}>عندي وظيفة</button><button type="button" aria-pressed={publishMode === 'seeker'} onClick={() => setPublishMode('seeker')}>بدور على وظيفة</button></div><PublishForm key={publishMode} mode={publishMode} localities={localities} /></div></div></section>
  </>;
}
