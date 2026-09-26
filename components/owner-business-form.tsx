'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Category, LocalityPage } from '@/lib/types';
import { ensureClientSession, type ClientSessionUser } from '@/components/auth/client-session';
import type { OwnerListing } from '@/lib/owner-listings';
import { ownerPhotoUrl } from '@/lib/owner-listing-photo';
import styles from './owner-business-form.module.css';

type Fields = Pick<OwnerListing, 'name' | 'phone' | 'hours' | 'address' | 'description' | 'category' | 'locality'>;
const empty: Fields = { name: '', phone: '', hours: '', address: '', description: '', category: '', locality: '' };
const maxPhotoSize = 4 * 1024 * 1024;

function PhotoPreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <Image src={url} alt={`صورة جديدة: ${file.name}`} width={130} height={110} unoptimized />;
}

export function OwnerBusinessForm({
  categories, localities, editId = '', initialName = '', initialCategory = '', initialLocality = '',
}: {
  categories: Category[];
  localities: LocalityPage[];
  editId?: string;
  initialName?: string;
  initialCategory?: string;
  initialLocality?: string;
}) {
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingId, setListingId] = useState(editId);
  const [fields, setFields] = useState<Fields>({
    ...empty, name: initialName.slice(0, 160),
    category: categories.some((item) => item.name === initialCategory) ? initialCategory : '',
    locality: localities.some((item) => item.name === initialLocality) ? initialLocality : '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [mine, setMine] = useState<OwnerListing[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void ensureClientSession().then(async (member) => {
      if (!active) return;
      setUser(member);
      if (!member) { setLoading(false); return; }
      try {
        const [ownReply, editReply] = await Promise.all([
          fetch('/api/owner-listings', { cache: 'no-store' }),
          editId ? fetch(`/api/owner-listings/${editId}`, { cache: 'no-store' }) : Promise.resolve(null),
        ]);
        if (!ownReply.ok) throw new Error('تعذر تحميل أنشطتك.');
        const ownData = await ownReply.json() as { listings: OwnerListing[] };
        if (active) setMine(ownData.listings);
        if (editReply) {
          if (!editReply.ok) throw new Error('النشاط المطلوب غير موجود في حسابك.');
          const { listing } = await editReply.json() as { listing: OwnerListing };
          if (active) {
            setFields({
              name: listing.name, phone: listing.phone, hours: listing.hours,
              address: listing.address, description: listing.description,
              category: listing.category, locality: listing.locality,
            });
            setPhotos(listing.photo_paths);
          }
        }
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : 'تعذر تحميل البيانات.');
      } finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [editId]);

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setSuccess('');
    setError('');
  }

  function choosePhotos(next: FileList | null) {
    if (!next) return;
    setError('');
    const picked = Array.from(next);
    if (photos.length + files.length + picked.length > 5) {
      setError('ممكن ترفع لحد ٥ صور للنشاط. امسح صورة أو قلل العدد.');
    } else if (picked.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > maxPhotoSize)) {
      setError('اختار صور JPG أو PNG أو WebP، وكل صورة أقل من ٤ ميجابايت.');
    } else {
      setFiles((current) => [...current, ...picked]);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  async function removePhoto(path: string) {
    if (!listingId || busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/owner-listings/${listingId}/photos`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await response.json() as { listing?: OwnerListing; error?: string };
      if (!response.ok || !data.listing) throw new Error(data.error || 'تعذر حذف الصورة.');
      setPhotos(data.listing.photo_paths);
      setSuccess('الصورة اتشالت، والتعديل رجع للمراجعة قبل النشر.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر حذف الصورة.');
    } finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setSuccess(''); setError(''); setUploading('');
    let savedId = listingId;
    try {
      const response = await fetch(savedId ? `/api/owner-listings/${savedId}` : '/api/owner-listings', {
        method: savedId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await response.json() as { listing?: OwnerListing; error?: string };
      if (!response.ok || !data.listing) throw new Error(data.error || 'تعذر حفظ النشاط.');
      savedId = data.listing.id;
      setListingId(savedId);
      setPhotos(data.listing.photo_paths);

      for (let index = 0; index < files.length; index += 1) {
        setUploading(`جارٍ رفع الصورة ${index + 1} من ${files.length}…`);
        const form = new FormData();
        form.append('photo', files[index]);
        const upload = await fetch(`/api/owner-listings/${savedId}/photos`, { method: 'POST', body: form });
        const uploadData = await upload.json() as { listing?: OwnerListing; error?: string };
        if (!upload.ok || !uploadData.listing) {
          setFiles(files.slice(index));
          throw new Error(`النشاط اتحفظ، لكن في صورة ما اترفعتش: ${uploadData.error || 'حاول تاني.'} الصور الباقية ظاهرة هنا لإعادة المحاولة.`);
        }
        setPhotos(uploadData.listing.photo_paths);
      }
      setFiles([]);
      setSuccess('نشاطك اتحفظ باسم حسابك ووصل للمراجعة. هتقدر تتابع حالته من «أنشطتي».');
      const ownReply = await fetch('/api/owner-listings', { cache: 'no-store' });
      if (ownReply.ok) setMine((await ownReply.json() as { listings: OwnerListing[] }).listings);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'تعذر حفظ النشاط.');
    } finally { setBusy(false); setUploading(''); }
  }

  if (loading) return <div className={styles.loading}>بنجهّز مساحة نشاطك…</div>;
  if (!user) return (
    <div className={styles.signIn}>
      <span className={styles.step}>نشاطك باسمك</span>
      <h2>سجّل دخولك الأول، والنشاط يبقى مربوط بحسابك.</h2>
      <p>بعد الدخول تقدر تضيف بيانات نشاطك وصوره، وتتابع المراجعة وتعدّل عليه من حسابك.</p>
      <div className={styles.signInActions}><Link href="/account/login" className="button button--primary">تسجيل الدخول</Link><Link href="/account/register" className="button button--ghost">إنشاء حساب جديد</Link></div>
    </div>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.formWrap}>
        <div className={styles.intro}><span className={styles.step}>٠١ / بيانات النشاط</span><h2>{listingId ? 'عدّل نشاطك' : 'عرّف الناس بنشاطك'}</h2><p>اكتب البيانات اللي تساعد أهل البلد يوصلوا لك من أول مرة. النشاط هيتسجل باسم حسابك، والنشر بعد مراجعة البيانات والصور.</p></div>
        <form className={styles.form} onSubmit={save}>
          <div className={styles.sectionTitle}><b>١</b><div><h3>الاسم والتواصل</h3><p>بيانات واضحة تظهر في صفحة نشاطك بعد اعتمادها.</p></div></div>
          <div className={styles.grid}>
            <label className={styles.field}><span>اسم النشاط <i>*</i></span><input required minLength={2} maxLength={160} value={fields.name} onChange={(event) => update('name', event.target.value)} placeholder="مثال: صيدلية البلد" autoComplete="organization" /></label>
            <label className={styles.field}><span>رقم الجوال <i>*</i></span><input required type="tel" inputMode="tel" dir="ltr" maxLength={20} value={fields.phone} onChange={(event) => update('phone', event.target.value)} placeholder="01012345678" autoComplete="tel" /><small>الرقم ده هيظهر للزوار عشان يتواصلوا معاك.</small></label>
            <label className={styles.field}><span>القسم <i>*</i></span><select required value={fields.category} onChange={(event) => update('category', event.target.value)}><option value="">اختار نوع النشاط</option>{categories.map((item) => <option value={item.name} key={item.slug}>{item.shortLabel}</option>)}</select></label>
            <label className={styles.field}><span>القرية أو الموضع <i>*</i></span><select required value={fields.locality} onChange={(event) => update('locality', event.target.value)}><option value="">اختار مكان النشاط</option>{localities.map((item) => <option value={item.name} key={item.slug}>{item.name}</option>)}</select></label>
          </div>

          <div className={styles.sectionTitle}><b>٢</b><div><h3>الوصول والتفاصيل</h3><p>قول لنا فين المكان وإمتى الناس تلاقيك.</p></div></div>
          <div className={styles.grid}>
            <label className={styles.field}><span>مواعيد العمل <i>*</i></span><input required minLength={3} maxLength={180} value={fields.hours} onChange={(event) => update('hours', event.target.value)} placeholder="السبت–الخميس، ٩ صباحًا–٩ مساءً" /></label>
            <label className={styles.field}><span>العنوان <i>*</i></span><input required minLength={5} maxLength={240} value={fields.address} onChange={(event) => update('address', event.target.value)} placeholder="الشارع، أقرب علامة واضحة، القرية" autoComplete="street-address" /></label>
            <label className={`${styles.field} ${styles.wide}`}><span>وصف النشاط <i>*</i></span><textarea required minLength={20} maxLength={2000} rows={5} value={fields.description} onChange={(event) => update('description', event.target.value)} placeholder="بتقدم إيه؟ وإيه اللي يميز خدمتك؟ اكتب وصفًا حقيقيًا يفيد اللي بيدوّر عليك." /><small>{fields.description.length.toLocaleString('ar-EG')} / ٢٠٠٠ حرف</small></label>
          </div>

          <div className={styles.sectionTitle}><b>٣</b><div><h3>صور من نشاطك</h3><p>الواجهة، المكان، أو شغلك الحقيقي. الصور اختيارية وتظهر بعد المراجعة.</p></div></div>
          <div className={styles.photoBox}>
            <label className={styles.photoPicker} htmlFor="owner-photos"><strong>＋ أضف صور النشاط</strong><span>لحد ٥ صور · JPG أو PNG أو WebP · ٤ ميجابايت للصورة</span></label>
            <input id="owner-photos" ref={inputRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => choosePhotos(event.target.files)} disabled={busy || photos.length + files.length >= 5} />
            {(photos.length > 0 || files.length > 0) && <div className={styles.photoGrid}>
              {photos.map((path, index) => <div className={styles.photo} key={path}><Image src={ownerPhotoUrl(path)} alt={`صورة النشاط ${index + 1}`} width={130} height={110} unoptimized /><button type="button" disabled={busy} onClick={() => void removePhoto(path)} aria-label={`حذف صورة النشاط ${index + 1}`}>حذف</button></div>)}
              {files.map((file, index) => <div className={styles.photo} key={`${file.name}-${file.size}-${file.lastModified}-${index}`}><PhotoPreview file={file} /><button type="button" disabled={busy} onClick={() => setFiles((current) => current.filter((_, item) => item !== index))} aria-label={`إزالة الصورة الجديدة ${index + 1}`}>إزالة</button></div>)}
            </div>}
          </div>

          <div className={styles.submit}>
            <div aria-live="polite">{error ? <p className={styles.error} role="alert">{error}</p> : success ? <p className={styles.success}>{success}</p> : <p>بالإرسال أنت صاحب النشاط داخل الدليل، والتعديل أو النشر يمر بالمراجعة حفاظًا على دقة البيانات.</p>}{uploading && <p>{uploading}</p>}</div>
            <button type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : listingId ? 'حفظ وإرسال للمراجعة' : 'إضافة نشاطي للمراجعة'}</button>
          </div>
        </form>
      </div>
      <aside className={styles.sidebar} id="my-activities">
        <span className={styles.step}>أنشطتي في الدليل</span>
        <h2>كل نشاط له صاحبه</h2>
        <p>الحساب ده هو صاحب الأنشطة اللي يضيفها. تقدر تعدّل التفاصيل وتتابع حالة المراجعة من هنا.</p>
        {mine.length ? <div className={styles.ownList}>{mine.map((listing) => <article key={listing.id}><span className={`${styles.status} ${styles[listing.status]}`}>{listing.status === 'published' ? 'منشور' : listing.status === 'rejected' ? 'يحتاج تعديلًا' : 'قيد المراجعة'}</span><h3>{listing.name}</h3><small>{listing.locality} · {listing.category}</small><div><Link href={`/contribute?edit=${listing.id}`}>تعديل النشاط</Link>{listing.status === 'published' && <Link href={`/activity/${listing.id}/`}>عرض الصفحة</Link>}</div></article>)}</div> : <div className={styles.empty}>أول نشاط تضيفه هيظهر هنا، تحت حسابك مباشرة.</div>}
        <Link href="/account" className={styles.accountLink}>الرجوع لحسابك ←</Link>
      </aside>
    </div>
  );
}
