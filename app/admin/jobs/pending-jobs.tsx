'use client';

import { useState } from 'react';
import type { PendingJob } from './page';
import styles from './pending-jobs.module.css';

export function PendingJobs({ initial }: { initial: PendingJob[] }) {
  const [jobs, setJobs] = useState(initial);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  async function update(id: string, status: 'published' | 'rejected') {
    setWorking(id);
    setError('');
    try {
      const response = await fetch('/api/admin/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (!response.ok || !(await response.json()).ok) throw new Error('failed');
      setJobs((current) => current.filter((job) => job.id !== id));
    } catch { setError('ما قدرناش نحفظ القرار دلوقت. جرب تاني.'); }
    finally { setWorking(''); }
  }
  return <div className={styles.list}><p>طلبات تنتظر المراجعة: <strong>{jobs.length.toLocaleString('ar-EG')}</strong></p>{error ? <p role="alert" className={styles.error}>{error}</p> : null}{jobs.length ? jobs.map((job) => <article key={job.id} className={styles.card}><header><span>{job.kind === 'offer' ? 'فرصة شغل' : 'باحث عن وظيفة'}</span><time dateTime={job.created_at}>{new Date(job.created_at).toLocaleString('ar-EG')}</time></header><h2>{job.title}</h2><p><strong>{job.organization || 'شخص من أهل البلد'}</strong> · {job.locality} · {job.field}</p><p>{job.description}</p>{job.experience ? <p>الخبرة: {job.experience}</p> : null}<p dir="ltr">{job.contact_kind}: {job.contact_value}</p><small>موافقة نشر التواصل: {job.contact_consent ? 'نعم' : 'لا'}</small><div><button disabled={working === job.id} onClick={() => update(job.id, 'published')}>انشر الإعلان</button><button disabled={working === job.id} onClick={() => update(job.id, 'rejected')}>ارفضه</button></div></article>) : <div className={styles.empty}>ما فيش طلبات تنتظر المراجعة.</div>}</div>;
}
