'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { articleKind, articlePath, articleTitle, blankFields, editorialFields, roleModelFields, sharingFields, type ArticleDocument, type Field } from '@/lib/article-document';
import { editorialImagePath } from '@/lib/editorial-image-path';
import styles from './article-editor.module.css';

export type ArticleEditorState = { document: ArticleDocument; slug: string; origin: 'static' | 'original'; status: string; version: string | null };
type Values = Record<string, unknown>;
type FieldProps = { fields: Field[]; value: Values; onChange: (value: Values) => void; onUpload: (busy: boolean) => void };

function Fields({ fields, value, onChange, onUpload }: FieldProps) {
  function set(key: string, next: unknown) { onChange({ ...value, [key]: next }); }
  return <>{fields.map(field => {
    const current = value[field.key];
    if (field.type === 'object') return <section className={styles.group} key={field.key}><header><h3>{field.label}</h3>{field.optional && <button type="button" onClick={() => set(field.key, current ? undefined : blankFields(field.fields || []))}>{current ? 'إزالة' : 'إضافة'}</button>}</header>{current || !field.optional ? <>{field.image && <ImageUpload value={(current || {}) as Values} onChange={v => set(field.key, v)} onUpload={onUpload} />}<Fields fields={field.fields || []} value={(current || {}) as Values} onChange={v => set(field.key, v)} onUpload={onUpload} /></> : <p>لم تُضف صورة لهذا الموضع.</p>}</section>;
    if (field.type === 'list') {
      const rows = (current || []) as Values[];
      return <section className={styles.group} key={field.key}><header><h3>{field.label} <small>({rows.length})</small></h3><button type="button" onClick={() => set(field.key, [...rows, blankFields(field.fields || [])])}>+ إضافة</button></header>{rows.map((row, index) => <div className={styles.listItem} key={index}><div className={styles.itemToolbar}><strong>{String(row.heading || row.label || row.name || `${field.label} ${index + 1}`)}</strong><div><button type="button" disabled={!index} aria-label={`نقل ${field.label} ${index + 1} لأعلى`} onClick={() => { const next = [...rows]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; set(field.key, next); }}>↑</button><button type="button" disabled={index === rows.length - 1} aria-label={`نقل ${field.label} ${index + 1} لأسفل`} onClick={() => { const next = [...rows]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; set(field.key, next); }}>↓</button><button type="button" aria-label={`إزالة ${field.label} ${index + 1}`} onClick={() => set(field.key, rows.filter((_, n) => n !== index))}>إزالة</button></div></div>{field.image && <ImageUpload value={row} onChange={v => set(field.key, rows.map((r, n) => n === index ? v : r))} onUpload={onUpload} />}<Fields fields={field.fields || []} value={row} onChange={v => set(field.key, rows.map((r, n) => n === index ? v : r))} onUpload={onUpload} /></div>)}</section>;
    }
    const paragraphs = ['intro', 'introduction', 'paragraphs'].includes(field.key);
    const separator = paragraphs ? '\n\n' : '\n';
    return <label className={styles.field} key={field.key}><span>{field.label}</span>{field.type === 'long' || field.type === 'lines' ? <textarea rows={field.type === 'lines' && paragraphs ? 8 : 4} value={field.type === 'lines' ? ((current || []) as string[]).join(separator) : String(current || '')} onChange={event => set(field.key, field.type === 'lines' ? event.target.value.split(separator) : event.target.value)} /> : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} inputMode={field.type === 'url' ? 'url' : undefined} dir={['imagePath', 'url', 'date', 'number'].includes(field.type) ? 'ltr' : undefined} value={typeof current === 'number' ? current : String(current || '')} onChange={event => set(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)} />}{field.type === 'lines' && <small>{paragraphs ? 'افصلي بين كل فقرتين بسطر فارغ.' : 'اكتبي كل عنصر في سطر مستقل.'}</small>}</label>;
  })}</>;
}

function ImageUpload({ value, onChange, onUpload }: { value: Values; onChange: (value: Values) => void; onUpload: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = 'asset' in value ? 'asset' : 'src';
  const path = typeof value[key] === 'string' ? value[key] as string : '';
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 4_000_000) { setError('اختاري صورة أقل من ٤ ميجابايت.'); return; }
    setBusy(true); onUpload(true); setError('');
    try {
      const form = new FormData(); form.set('photo', file);
      const response = await fetch('/api/moderator/article-media', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'تعذّر رفع الصورة.');
      onChange({ ...value, [key]: data.src, width: data.width, height: data.height });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذّر رفع الصورة.'); }
    finally { setBusy(false); onUpload(false); }
  }
  return <div className={styles.upload}>{path && <Image src={path.startsWith('/') ? path : editorialImagePath(path)} width={Number(value.width) || 360} height={Number(value.height) || 240} alt={String(value.alt || 'معاينة الصورة')} unoptimized />}<label><span>{busy ? 'جارٍ رفع الصورة…' : path ? 'استبدال الصورة' : 'رفع صورة'}</span><input type="file" disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event.target.files?.[0])} /></label><small>JPG أو PNG أو WebP · حتى ٤ ميجابايت. الصورة تبقى خاصة حتى نشر المقال.</small>{error && <p role="alert">{error}</p>}</div>;
}

const sections = [{ id: 'basics', label: 'التعريف' }, { id: 'story', label: 'النص والأقسام' }, { id: 'media', label: 'الصور والغلاف' }, { id: 'sources', label: 'المصادر والكاتب' }, { id: 'seo', label: 'السيو والمشاركة' }] as const;
const groups: Record<string, string[]> = {
  basics: ['title', 'name', 'articleTitle', 'locality', 'category', 'excerpt', 'shortTitle', 'heroTags', 'publishedAt', 'diedAt'],
  story: ['intro', 'introduction', 'sections', 'faqs', 'highlights', 'interestsLabel', 'interests', 'relatedVillage'],
  media: ['hero', 'photos', 'cardPhotoIndex', 'socialPhotoIndex', 'socialImage', 'imageNotice'],
  sources: ['sources', 'sourceLabel', 'sourceUrl', 'additionalSources', 'sourceDisclosure', 'rewrittenBy', 'authorName', 'authorUrl', 'authorRole', 'authorBio'],
  seo: ['seoTitle', 'description', 'keywords', 'alternateNames'],
};

export default function FullArticleEditor({ initial, onClose, onSaved }: { initial: ArticleEditorState; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const [doc, setDoc] = useState(initial.document);
  const [slug, setSlug] = useState(initial.slug);
  const [version, setVersion] = useState(initial.version);
  const [saved, setSaved] = useState(JSON.stringify(initial.document));
  const [tab, setTab] = useState<string>('basics');
  const [busy, setBusy] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState('');
  const dirty = JSON.stringify(doc) !== saved;
  const kind = articleKind(doc);
  const fields = doc.format === 'editorial' ? editorialFields : roleModelFields;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    function protect(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  function close() { if (!busy && !uploadCount && (!dirty || window.confirm('عندك تعديلات لم تُحفظ. إغلاق المحرر؟'))) onClose(); }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const targets = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),iframe') || [])].filter(element => element.getClientRects().length);
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function onUpload(working: boolean) { setUploadCount(count => Math.max(0, count + (working ? 1 : -1))); }
  async function save(status: 'draft' | 'published' | 'hidden', showPreview = false) {
    if (status === 'hidden' && !window.confirm('إخفاء هذا المقال من الموقع؟')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/moderator/article', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, slug, origin: initial.origin, status, document: doc, version }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'تعذّر حفظ المقال.');
      setDoc(result.document); setSaved(JSON.stringify(result.document)); setSlug(result.slug); setVersion(result.version);
      setMessage(status === 'published' ? 'تم نشر المقال بكل تفاصيله.' : status === 'hidden' ? 'تم إخفاء المقال من الموقع.' : 'المسودة اتحفظت. النسخة المنشورة لم تتغيّر.');
      onSaved();
      if (showPreview) setPreview(`/moderator/preview/?kind=${kind}&slug=${encodeURIComponent(result.slug)}&v=${encodeURIComponent(result.version)}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'تعذّر حفظ المقال.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.overlay}><section ref={dialogRef} tabIndex={-1} onKeyDown={keyboard} className={styles.editor} role="dialog" aria-modal="true" aria-label="محرر المقال الكامل"><header className={styles.header}><div><span>مساحة آية · محرر المقال الكامل</span><h2>{articleTitle(doc) || 'مقال جديد'}</h2><small>{dirty ? 'تعديلات غير محفوظة' : 'كل التعديلات محفوظة'} · {doc.format === 'role_model' ? 'نماذج مشرفة' : 'مقالات الدليل'}</small></div><button type="button" disabled={busy || !!uploadCount} onClick={close} aria-label="إغلاق محرر المقال">×</button></header><nav className={styles.tabs} aria-label="تفاصيل المقال">{sections.map(section => <button key={section.id} type="button" disabled={busy || !!uploadCount} aria-current={tab === section.id ? 'page' : undefined} onClick={() => { setTab(section.id); setPreview(''); }}>{section.label}</button>)}</nav><div className={styles.scroll}><p className={styles.notice}>عدّلي المحتوى والصور مع الاحتفاظ بقالب المقال. «حفظ مسودة» للمراجعة، و«نشر التعديلات» لإظهارها للزوار.</p>{error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success} role="status">{message}</p>}<fieldset disabled={busy || !!uploadCount} className={styles.fields}><legend className={styles.srOnly}>حقول المقال</legend><Fields fields={fields.filter(field => groups[tab]?.includes(field.key))} value={doc.content as unknown as Values} onChange={content => setDoc({ ...doc, content } as ArticleDocument)} onUpload={onUpload} />{tab === 'seo' && <section className={styles.group}><header><h3>بطاقة واتساب والسوشيال ميديا</h3></header><Fields fields={sharingFields} value={doc.sharing as unknown as Values} onChange={sharing => setDoc({ ...doc, sharing } as ArticleDocument)} onUpload={onUpload} /></section>}</fieldset>{preview && <section className={styles.preview}><h3>معاينة المسودة المحفوظة</h3><iframe key={preview} src={preview} title="معاينة المقال قبل النشر" /><a href={preview} target="_blank" rel="noreferrer">فتح المعاينة بحجم كامل ↗</a></section>}</div><footer className={styles.footer}><div><button type="button" disabled={busy || !!uploadCount} onClick={() => void save('published')}>{busy ? 'جارٍ الحفظ…' : 'نشر التعديلات'}</button><button type="button" disabled={busy || !!uploadCount} onClick={() => void save('draft')}>حفظ مسودة</button><button type="button" disabled={busy || !!uploadCount} onClick={() => void save('draft', true)}>حفظ ومعاينة</button>{slug && <a href={articlePath(kind, slug)} target="_blank" rel="noreferrer">المقال المنشور ↗</a>}</div>{slug && <button type="button" disabled={busy || !!uploadCount} className={styles.hide} onClick={() => void save('hidden')}>إخفاء المقال</button>}</footer></section></div>;
}
