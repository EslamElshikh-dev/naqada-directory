'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { OwnerListing } from '@/lib/owner-listings';
import { ownerPhotoUrl } from '@/lib/owner-listing-photo';
import styles from './pending-activities.module.css';

export function PendingActivities({ initial }: { initial: OwnerListing[] }) {
  const [listings, setListings] = useState(initial);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  async function decide(id: string, status: 'published' | 'rejected') {
    setWorking(id); setError('');
    try {
      const response = await fetch('/api/admin/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok || !(await response.json() as { ok: boolean }).ok) throw new Error('save');
      setListings((current) => current.filter((item) => item.id !== id));
    } catch { setError('ما قدرناش نحفظ القرار دلوقت. حاول تاني.'); }
    finally { setWorking(''); }
  }

  return <div className={styles.list}>
    <p>في انتظار المراجعة: <strong>{listings.length.toLocaleString('ar-EG')}</strong></p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {listings.length ? listings.map((item) => <article className={styles.card} key={item.id}>
      <header><span>نشاط يملكه عضو مسجّل</span><time dateTime={item.updated_at}>{new Date(item.updated_at).toLocaleString('ar-EG')}</time></header>
      <h2>{item.name}</h2>
      <p><strong>{item.category}</strong> · {item.locality} · {item.address}</p>
      <p>{item.description}</p>
      <dl><div><dt>رقم الجوال</dt><dd dir="ltr">{item.phone}</dd></div><div><dt>المواعيد</dt><dd>{item.hours}</dd></div></dl>
      {!!item.photo_paths.length && <div className={styles.photos}>{item.photo_paths.map((path, index) => <a href={ownerPhotoUrl(path)} target="_blank" rel="noopener noreferrer" key={path} aria-label={`افتح الصورة ${index + 1} كاملة`}><Image src={ownerPhotoUrl(path)} alt={`صورة ${index + 1} من ${item.name}`} width={150} height={110} unoptimized /></a>)}</div>}
      <div className={styles.actions}><button type="button" disabled={working === item.id} onClick={() => void decide(item.id, 'published')}>اعتماد ونشر</button><button type="button" disabled={working === item.id} onClick={() => void decide(item.id, 'rejected')}>إرجاع للتعديل</button></div>
    </article>) : <div className={styles.empty}>كل الطلبات اتراجعت. مفيش أنشطة جديدة دلوقت.</div>}
  </div>;
}
